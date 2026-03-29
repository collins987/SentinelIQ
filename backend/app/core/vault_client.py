"""
HashiCorp Vault Client - Enterprise Secrets Management

Provides:
- Dynamic database credentials (no static passwords)
- Encryption as a service (Transit engine)
- Secure secret storage and retrieval
- Per-user encryption keys for GDPR crypto-shredding

Features:
- Automatic token renewal
- Graceful degradation if Vault unavailable
- Caching to reduce API calls

Compliance: PCI-DSS Requirement 3.5, SOC 2
"""

import logging
import asyncio
from prometheus_client import Counter, Gauge
import os
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from functools import lru_cache
import base64
import json

import hvac
from hvac.exceptions import VaultError, InvalidPath, Forbidden

from app.config import (
    VAULT_ADDR,
    VAULT_TOKEN,
    VAULT_SECRET_PATH,
    VAULT_MODE,
    VAULT_ENABLE_TOKEN_RENEWAL,
)

logger = logging.getLogger("sentineliq.vault")

# Prometheus metrics
vault_token_renewals = Counter('vault_token_renewals_total', 'Total Vault token renewals')
vault_secret_access = Counter('vault_secret_access_total', 'Total Vault secret accesses', ['user_id', 'role', 'action'])
vault_crypto_ops = Counter('vault_crypto_ops_total', 'Total Vault crypto operations', ['user_id', 'role', 'action'])
vault_errors = Counter('vault_errors_total', 'Total Vault errors', ['action'])
vault_token_ttl_gauge = Gauge('vault_token_ttl_seconds', 'Vault token time-to-live in seconds')

# RBAC enforcement helper
def enforce_vault_rbac(user_role, allowed_roles, action, user_id=None):
    if user_role not in allowed_roles:
        logger.warning(f"RBAC: {user_role} not allowed to perform {action}", extra={"user_id": user_id, "role": user_role, "action": action})
        raise PermissionError(f"Role {user_role} not allowed for {action}")


@dataclass
class VaultConfig:
    """Vault configuration."""
    addr: str = VAULT_ADDR
    token: str = VAULT_TOKEN
    secret_path: str = VAULT_SECRET_PATH
    
    # Transit engine mount
    transit_mount: str = "transit"
    
    # Database engine mount
    database_mount: str = "database"
    
    # KV secrets engine mount
    kv_mount: str = "secret"
    
    # Connection timeout
    timeout: int = 30
    
    # Token renewal threshold (renew when less than this time remaining)
    renewal_threshold_seconds: int = 300

    # Runtime mode controls token-renew behavior and log verbosity
    mode: str = VAULT_MODE
    enable_token_renewal: bool = VAULT_ENABLE_TOKEN_RENEWAL


class VaultClient:
    """
    HashiCorp Vault client for secrets management.
    
    Usage:
        vault = VaultClient()
        
        # Get a secret
        secret = vault.get_secret("database/credentials")
        
        # Encrypt data
        ciphertext = vault.encrypt("user_123", "sensitive data")
        
        # Decrypt data
        plaintext = vault.decrypt("user_123", ciphertext)
        
        # Get dynamic database credentials
        username, password = vault.get_database_credentials("postgres")
    """
    
    def __init__(self, config: Optional[VaultConfig] = None):
        self.config = config or VaultConfig()
        self._client: Optional[hvac.Client] = None
        self._token_expiry: Optional[datetime] = None
        self._initialized = False
        
        self._initialize()
    
    def _initialize(self):
        """Initialize Vault client."""
        try:
            self._client = hvac.Client(
                url=self.config.addr,
                token=self.config.token,
                timeout=self.config.timeout
            )
            
            if self._client.is_authenticated():
                self._initialized = True
                logger.info(f"Vault client connected to {self.config.addr}")
                
                # Get token info for renewal tracking
                try:
                    token_info = self._client.auth.token.lookup_self()
                    if token_info and 'data' in token_info:
                        ttl = token_info['data'].get('ttl', 0)
                        self._token_expiry = datetime.utcnow() + timedelta(seconds=ttl)
                except Exception:
                    pass
            else:
                logger.warning("Vault client authentication failed")
                self._initialized = False
                
        except Exception as e:
            logger.warning(f"Vault client initialization failed: {e}")
            self._initialized = False
    
    def is_authenticated(self) -> bool:
        """Check if client is authenticated to Vault."""
        if not self._initialized or not self._client:
            return False
        
        try:
            return self._client.is_authenticated()
        except Exception:
            return False
    
    async def _background_token_renewal(self):
        """Background task to renew Vault token periodically."""
        while True:
            try:
                self._ensure_authenticated()
            except Exception as e:
                logger.warning(f"Vault token renewal failed: {e}")
            await asyncio.sleep(60)

    def start_token_renewal_task(self):
        if not self.config.enable_token_renewal:
            logger.info("Vault token renewal disabled for current mode")
            return
        if not hasattr(self, '_token_renewal_task'):
            self._token_renewal_task = asyncio.create_task(self._background_token_renewal())

    def _ensure_authenticated(self):
        """Ensure client is authenticated, renew if needed."""
        if not self._initialized:
            raise VaultError("Vault client not initialized")
        
        # Check if token needs renewal
        if self._token_expiry:
            time_remaining = (self._token_expiry - datetime.utcnow()).total_seconds()
            vault_token_ttl_gauge.set(time_remaining)
            if time_remaining < self.config.renewal_threshold_seconds:
                try:
                    self._client.auth.token.renew_self()
                    token_info = self._client.auth.token.lookup_self()
                    ttl = token_info['data'].get('ttl', 0)
                    self._token_expiry = datetime.utcnow() + timedelta(seconds=ttl)
                    logger.info("Vault token renewed")
                    vault_token_renewals.inc()
                except Exception as e:
                    # Dev Vault tokens are commonly non-renewable; keep logs actionable.
                    if self.config.mode == "dev":
                        logger.info(f"Vault token renewal skipped in dev mode: {e}")
                    else:
                        logger.warning(f"Failed to renew Vault token: {e}")
    
    # =========================================================================
    # KV Secrets Engine
    # =========================================================================
    
    def get_secret(self, path: str, user_id: str = None, role: str = None) -> Optional[Dict[str, Any]]:
        """
        Get a secret from KV secrets engine.
        
        Args:
            path: Secret path (e.g., "database/credentials")
            
        Returns:
            Secret data as dictionary, or None if not found
        """
        if not self._initialized:
            logger.warning("Vault not available, returning None")
            vault_errors.labels(action="get_secret").inc()
            return None
        try:
            self._ensure_authenticated()
            # RBAC: Only admin/analyst can access secrets
            enforce_vault_rbac(role, ["admin", "analyst"], "get_secret", user_id)
            response = self._client.secrets.kv.v2.read_secret_version(
                path=path,
                mount_point=self.config.kv_mount
            )
            vault_secret_access.labels(user_id or "unknown", role or "unknown", "get_secret").inc()
            return response.get('data', {}).get('data', {})
        except InvalidPath:
            logger.debug(f"Secret not found: {path}")
            return None
        except Forbidden:
            logger.error(f"Access denied to secret: {path}")
            vault_errors.labels(action="get_secret").inc()
            return None
        except Exception as e:
            logger.error(f"Error reading secret {path}: {e}")
            vault_errors.labels(action="get_secret").inc()
            return None
    
    def put_secret(self, path: str, data: Dict[str, Any], user_id: str = None, role: str = None) -> bool:
        """
        Store a secret in KV secrets engine.
        
        Args:
            path: Secret path
            data: Secret data to store
            
        Returns:
            True if successful, False otherwise
        """
        if not self._initialized:
            logger.warning("Vault not available, cannot store secret")
            vault_errors.labels(action="put_secret").inc()
            return False
        try:
            self._ensure_authenticated()
            enforce_vault_rbac(role, ["admin"], "put_secret", user_id)
            self._client.secrets.kv.v2.create_or_update_secret(
                path=path,
                secret=data,
                mount_point=self.config.kv_mount
            )
            logger.debug(f"Secret stored: {path}")
            vault_secret_access.labels(user_id or "unknown", role or "unknown", "put_secret").inc()
            return True
        except Exception as e:
            logger.error(f"Error storing secret {path}: {e}")
            vault_errors.labels(action="put_secret").inc()
            return False
    
    def delete_secret(self, path: str, user_id: str = None, role: str = None) -> bool:
        """Delete a secret from KV secrets engine."""
        if not self._initialized:
            vault_errors.labels(action="delete_secret").inc()
            return False
        try:
            self._ensure_authenticated()
            enforce_vault_rbac(role, ["admin"], "delete_secret", user_id)
            self._client.secrets.kv.v2.delete_metadata_and_all_versions(
                path=path,
                mount_point=self.config.kv_mount
            )
            logger.info(f"Secret deleted: {path}")
            vault_secret_access.labels(user_id or "unknown", role or "unknown", "delete_secret").inc()
            return True
        except Exception as e:
            logger.error(f"Error deleting secret {path}: {e}")
            vault_errors.labels(action="delete_secret").inc()
            return False
    
    # =========================================================================
    # Transit Engine (Encryption as a Service)
    # =========================================================================
    
    def _ensure_transit_engine(self) -> bool:
        """Ensure transit secrets engine is enabled."""
        try:
            mounts = self._client.sys.list_mounted_secrets_engines() or {}
            transit_path = f"{self.config.transit_mount}/"
            if transit_path in mounts:
                return True

            self._client.sys.enable_secrets_engine(
                backend_type="transit",
                path=self.config.transit_mount,
            )
            logger.info(f"Enabled Vault transit engine at path '{self.config.transit_mount}'")
            return True
        except Exception as e:
            logger.error(f"Failed to enable transit engine: {e}")
            return False

    def _ensure_transit_key(self, key_name: str) -> bool:
        """Ensure a transit encryption key exists."""
        try:
            if not self._ensure_transit_engine():
                return False
            # Try to read key info
            self._client.secrets.transit.read_key(
                name=key_name,
                mount_point=self.config.transit_mount
            )
            return True
        except InvalidPath:
            # Key doesn't exist, create it
            try:
                self._client.secrets.transit.create_key(
                    name=key_name,
                    key_type="aes256-gcm96",
                    mount_point=self.config.transit_mount
                )
                logger.info(f"Created transit key: {key_name}")
                return True
            except Exception as e:
                logger.error(f"Failed to create transit key {key_name}: {e}")
                return False
        except Exception as e:
            logger.error(f"Error checking transit key {key_name}: {e}")
            return False

    def ensure_transit_ready(self, key_name: str) -> bool:
        """Public helper to verify transit engine and key readiness."""
        if not self._initialized:
            return False
        try:
            self._ensure_authenticated()
            return self._ensure_transit_key(key_name)
        except Exception as e:
            logger.error(f"Transit readiness check failed for {key_name}: {e}")
            return False
    
    def encrypt(self, key_name: str, plaintext: str, user_id: str = None, role: str = None) -> Optional[str]:
        """
        Encrypt data using Vault Transit engine.
        
        Args:
            key_name: Name of the encryption key (e.g., "user_123")
            plaintext: Data to encrypt
            
        Returns:
            Ciphertext (vault:v1:...) or None on failure
        """
        if not self._initialized:
            logger.warning("Vault not available, encryption not possible")
            vault_errors.labels(action="encrypt").inc()
            return None
        try:
            self._ensure_authenticated()
            # RBAC: All roles can encrypt their own data, only admin/analyst can encrypt analytics
            allowed_roles = ["admin", "analyst"] if key_name.startswith("analytics_") else ["admin", "analyst", "user"]
            enforce_vault_rbac(role, allowed_roles, "encrypt", user_id)
            self._ensure_transit_key(key_name)
            plaintext_b64 = base64.b64encode(plaintext.encode()).decode()
            response = self._client.secrets.transit.encrypt_data(
                name=key_name,
                plaintext=plaintext_b64,
                mount_point=self.config.transit_mount
            )
            ciphertext = response['data']['ciphertext']
            vault_crypto_ops.labels(user_id or "unknown", role or "unknown", "encrypt").inc()
            return ciphertext
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            vault_errors.labels(action="encrypt").inc()
            return None
    
    def decrypt(self, key_name: str, ciphertext: str, user_id: str = None, role: str = None) -> Optional[str]:
        """
        Decrypt data using Vault Transit engine.
        
        Args:
            key_name: Name of the encryption key
            ciphertext: Encrypted data (vault:v1:...)
            
        Returns:
            Decrypted plaintext or None on failure
        """
        if not self._initialized:
            logger.warning("Vault not available, decryption not possible")
            vault_errors.labels(action="decrypt").inc()
            return None
        try:
            self._ensure_authenticated()
            allowed_roles = ["admin", "analyst"] if key_name.startswith("analytics_") else ["admin", "analyst", "user"]
            enforce_vault_rbac(role, allowed_roles, "decrypt", user_id)
            response = self._client.secrets.transit.decrypt_data(
                name=key_name,
                ciphertext=ciphertext,
                mount_point=self.config.transit_mount
            )
            plaintext_b64 = response['data']['plaintext']
            plaintext = base64.b64decode(plaintext_b64).decode()
            vault_crypto_ops.labels(user_id or "unknown", role or "unknown", "decrypt").inc()
            return plaintext
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            vault_errors.labels(action="decrypt").inc()
            return None
    
    def delete_encryption_key(self, key_name: str, user_id: str = None, role: str = None) -> bool:
        """
        Delete a transit encryption key (crypto-shredding).
        
        This permanently destroys the ability to decrypt any data
        encrypted with this key - used for GDPR right to erasure.
        
        WARNING: This is irreversible!
        """
        if not self._initialized:
            vault_errors.labels(action="delete_encryption_key").inc()
            return False
        try:
            self._ensure_authenticated()
            enforce_vault_rbac(role, ["admin"], "delete_encryption_key", user_id)
            self._client.secrets.transit.update_key_configuration(
                name=key_name,
                deletion_allowed=True,
                mount_point=self.config.transit_mount
            )
            self._client.secrets.transit.delete_key(
                name=key_name,
                mount_point=self.config.transit_mount
            )
            logger.warning(f"Encryption key deleted (crypto-shred): {key_name}")
            vault_crypto_ops.labels(user_id or "unknown", role or "unknown", "delete_encryption_key").inc()
            return True
        except InvalidPath:
            logger.debug(f"Key not found: {key_name}")
            return True  # Already deleted
        except Exception as e:
            logger.error(f"Failed to delete encryption key {key_name}: {e}")
            vault_errors.labels(action="delete_encryption_key").inc()
            return False
    
    # =========================================================================
    # Database Dynamic Credentials
    # =========================================================================
    
    def get_database_credentials(self, role: str = "sentineliq-app") -> Optional[Tuple[str, str]]:
        """
        Get dynamic database credentials from Vault.
        
        Args:
            role: Database role name
            
        Returns:
            Tuple of (username, password) or None on failure
        """
        if not self._initialized:
            logger.warning("Vault not available, using static credentials")
            return None
        
        try:
            self._ensure_authenticated()
            
            response = self._client.secrets.database.generate_credentials(
                name=role,
                mount_point=self.config.database_mount
            )
            
            data = response.get('data', {})
            username = data.get('username')
            password = data.get('password')
            
            if username and password:
                # Log lease info
                lease_duration = response.get('lease_duration', 0)
                logger.debug(
                    f"Got dynamic DB credentials (lease: {lease_duration}s)"
                )
                return username, password
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get database credentials: {e}")
            return None
    
    # =========================================================================
    # User-specific encryption (for GDPR crypto-shredding)
    # =========================================================================
    
    def encrypt_user_data(self, user_id: str, data: Dict[str, Any]) -> Optional[str]:
        """
        Encrypt user PII with user-specific key.
        
        When user requests deletion, we delete their key,
        making all their encrypted data permanently unreadable.
        """
        key_name = f"user_{user_id}"
        json_data = json.dumps(data)
        return self.encrypt(key_name, json_data)
    
    def decrypt_user_data(self, user_id: str, ciphertext: str) -> Optional[Dict[str, Any]]:
        """Decrypt user PII."""
        key_name = f"user_{user_id}"
        plaintext = self.decrypt(key_name, ciphertext)
        if plaintext:
            return json.loads(plaintext)
        return None
    
    def crypto_shred_user(self, user_id: str) -> bool:
        """
        Perform crypto-shredding for a user (GDPR deletion).
        
        Deletes the user's encryption key, making all their
        encrypted PII permanently unreadable.
        """
        key_name = f"user_{user_id}"
        return self.delete_encryption_key(key_name)



# --- Robust Vault Client Singleton with Retry and State ---
_vault_client: Optional[VaultClient] = None
_vault_last_attempt: Optional[float] = None
_vault_last_error: Optional[str] = None
_vault_state: str = "not_configured"  # healthy, unhealthy, not_configured

def get_vault_client(retries: int = 3, delay: float = 2.0) -> VaultClient:
    """Get or create Vault client singleton with retry logic and state tracking."""
    global _vault_client, _vault_last_attempt, _vault_last_error, _vault_state
    import time
    _vault_last_attempt = time.time()
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            if _vault_client is None or not _vault_client.is_authenticated():
                _vault_client = VaultClient()
                # Start background token renewal
                try:
                    _vault_client.start_token_renewal_task()
                except Exception as e:
                    logger.warning(f"Vault token renewal task not started: {e}")
            if _vault_client.is_authenticated():
                _vault_state = "healthy"
                _vault_last_error = None
                return _vault_client
            else:
                last_error = "Vault not authenticated after create()"
        except Exception as e:
            last_error = str(e)
        _vault_last_error = last_error
        _vault_state = "unhealthy"
        if attempt < retries:
            import time
            time.sleep(delay)
    # If all retries failed
    _vault_state = "unhealthy" if _vault_client else "not_configured"
    return _vault_client

def get_vault_health_status() -> dict:
    global _vault_client, _vault_state, _vault_last_error
    if _vault_state == "healthy":
        return {"status": "healthy"}
    elif _vault_state == "unhealthy":
        return {"status": "unhealthy", "error": _vault_last_error or "Vault not authenticated"}
    else:
        return {"status": "not_configured"}


# Dependency injection helper
def vault_dependency():
    """FastAPI dependency for Vault client."""
    return get_vault_client()


__all__ = [
    'VaultClient',
    'VaultConfig',
    'get_vault_client',
    'vault_dependency'
]
