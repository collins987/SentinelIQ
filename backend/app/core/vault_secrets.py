"""
Vault Secrets Integration — Replaces static .env credentials with Vault KV

On startup:
1. Seeds current config values into Vault KV (if not already present)
2. Reads secrets from Vault KV back into the running application config
3. Falls back to .env / environment variables if Vault is unavailable

Secrets stored under:   secret/sentineliq/database
                        secret/sentineliq/redis
                        secret/sentineliq/jwt
                        secret/sentineliq/smtp

Compliance: PCI-DSS 3.5 (no plaintext credentials at rest)
"""

import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("sentineliq.vault_secrets")


# ─── Vault paths ─────────────────────────────────────────────────────────────

VAULT_SECRET_PATHS = {
    "database": "sentineliq/database",
    "redis": "sentineliq/redis",
    "jwt": "sentineliq/jwt",
    "smtp": "sentineliq/smtp",
    "minio": "sentineliq/minio",
}


def _get_raw_client():
    """Get a raw hvac client for seeding (bypasses RBAC enforcement)."""
    try:
        import hvac
        from app.config import VAULT_ADDR, VAULT_TOKEN

        client = hvac.Client(url=VAULT_ADDR, token=VAULT_TOKEN, timeout=10)
        if client.is_authenticated():
            return client
    except Exception as e:
        logger.warning(f"Cannot connect to Vault for secrets management: {e}")
    return None


def _read_kv(client, path: str) -> Optional[Dict[str, Any]]:
    """Read a KV v2 secret, return data dict or None."""
    try:
        resp = client.secrets.kv.v2.read_secret_version(
            path=path, mount_point="secret"
        )
        return resp.get("data", {}).get("data")
    except Exception:
        return None


def _write_kv(client, path: str, data: Dict[str, Any]) -> bool:
    """Write a KV v2 secret. Returns True on success."""
    try:
        client.secrets.kv.v2.create_or_update_secret(
            path=path, secret=data, mount_point="secret"
        )
        return True
    except Exception as e:
        logger.error(f"Failed to write Vault secret {path}: {e}")
        return False


# ─── Seed secrets into Vault ─────────────────────────────────────────────────

def seed_secrets_to_vault() -> bool:
    """
    Seed current environment / config secrets into Vault KV.
    Only writes if the secret path does NOT already exist (first-run bootstrap).
    Returns True if Vault is available and seeding succeeded.
    """
    client = _get_raw_client()
    if not client:
        logger.warning("Vault unavailable — skipping secret seeding")
        return False

    from app.config import (
        JWT_SECRET_KEY, JWT_ALGORITHM,
        SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_TLS, EMAIL_FROM,
        REDIS_URL,
        MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_SECURE,
    )

    seed_map = {
        VAULT_SECRET_PATHS["database"]: {
            "url": os.getenv(
                "DATABASE_URL",
                "postgresql://sentineliq:sentineliq@postgres:5432/sentineliq",
            ),
        },
        VAULT_SECRET_PATHS["redis"]: {
            "url": REDIS_URL,
        },
        VAULT_SECRET_PATHS["jwt"]: {
            "secret_key": JWT_SECRET_KEY,
            "algorithm": JWT_ALGORITHM,
        },
        VAULT_SECRET_PATHS["smtp"]: {
            "host": SMTP_HOST,
            "port": str(SMTP_PORT),
            "username": SMTP_USERNAME or "",
            "password": SMTP_PASSWORD or "",
            "tls": str(SMTP_TLS),
            "from_address": EMAIL_FROM,
        },
        VAULT_SECRET_PATHS["minio"]: {
            "endpoint": MINIO_ENDPOINT,
            "access_key": MINIO_ACCESS_KEY,
            "secret_key": MINIO_SECRET_KEY,
            "secure": str(MINIO_SECURE),
        },
    }

    seeded = 0
    for path, data in seed_map.items():
        existing = _read_kv(client, path)
        if existing is None:
            if _write_kv(client, path, data):
                logger.info(f"Vault secret seeded: {path}")
                seeded += 1
        else:
            logger.debug(f"Vault secret already exists: {path}")

    logger.info(f"Vault secret seeding complete ({seeded} new secrets written)")
    return True


# ─── Load secrets from Vault into config ─────────────────────────────────────

def load_secrets_from_vault() -> Dict[str, Any]:
    """
    Read secrets from Vault KV and return them as a flat dictionary.
    The caller (main.py lifespan) applies them to the running config.

    Returns dict with keys like:
        database_url, redis_url, jwt_secret_key, smtp_host, etc.

    Returns empty dict if Vault is unavailable (graceful degradation).
    """
    client = _get_raw_client()
    if not client:
        logger.warning("Vault unavailable — using .env / environment defaults")
        return {}

    secrets: Dict[str, Any] = {}

    # Database
    db = _read_kv(client, VAULT_SECRET_PATHS["database"])
    if db:
        secrets["database_url"] = db.get("url")
        logger.info("Loaded database credentials from Vault")

    # Redis
    redis = _read_kv(client, VAULT_SECRET_PATHS["redis"])
    if redis:
        secrets["redis_url"] = redis.get("url")
        logger.info("Loaded Redis credentials from Vault")

    # JWT
    jwt = _read_kv(client, VAULT_SECRET_PATHS["jwt"])
    if jwt:
        secrets["jwt_secret_key"] = jwt.get("secret_key")
        secrets["jwt_algorithm"] = jwt.get("algorithm")
        logger.info("Loaded JWT signing keys from Vault")

    # SMTP
    smtp = _read_kv(client, VAULT_SECRET_PATHS["smtp"])
    if smtp:
        secrets["smtp_host"] = smtp.get("host")
        secrets["smtp_port"] = int(smtp.get("port", "1025"))
        secrets["smtp_username"] = smtp.get("username") or None
        secrets["smtp_password"] = smtp.get("password") or None
        secrets["smtp_tls"] = smtp.get("tls", "false").lower() == "true"
        secrets["email_from"] = smtp.get("from_address")
        logger.info("Loaded SMTP credentials from Vault")

    # MinIO
    minio = _read_kv(client, VAULT_SECRET_PATHS["minio"])
    if minio:
        secrets["minio_endpoint"] = minio.get("endpoint")
        secrets["minio_access_key"] = minio.get("access_key")
        secrets["minio_secret_key"] = minio.get("secret_key")
        secrets["minio_secure"] = minio.get("secure", "false").lower() == "true"
        logger.info("Loaded MinIO credentials from Vault")

    if secrets:
        logger.info(f"Vault secrets loaded: {len(secrets)} values applied")
    else:
        logger.info("No secrets found in Vault — using environment defaults")

    return secrets


def apply_secrets_to_config(secrets: Dict[str, Any]):
    """
    Apply Vault-sourced secrets to the running app config module.
    This overwrites the module-level variables that all services read.
    """
    if not secrets:
        return

    import app.config as cfg

    if "database_url" in secrets and secrets["database_url"]:
        os.environ["DATABASE_URL"] = secrets["database_url"]
        logger.debug("Applied Vault DATABASE_URL to environment")

    if "redis_url" in secrets and secrets["redis_url"]:
        cfg.REDIS_URL = secrets["redis_url"]
        cfg.settings = cfg.Settings()  # Rebuild settings singleton

    if "jwt_secret_key" in secrets and secrets["jwt_secret_key"]:
        cfg.JWT_SECRET_KEY = secrets["jwt_secret_key"]

    if "jwt_algorithm" in secrets and secrets["jwt_algorithm"]:
        cfg.JWT_ALGORITHM = secrets["jwt_algorithm"]

    if "smtp_host" in secrets and secrets["smtp_host"]:
        cfg.SMTP_HOST = secrets["smtp_host"]
    if "smtp_port" in secrets:
        cfg.SMTP_PORT = secrets["smtp_port"]
    if "smtp_username" in secrets:
        cfg.SMTP_USERNAME = secrets["smtp_username"]
    if "smtp_password" in secrets:
        cfg.SMTP_PASSWORD = secrets["smtp_password"]
    if "email_from" in secrets and secrets["email_from"]:
        cfg.EMAIL_FROM = secrets["email_from"]

    if "minio_endpoint" in secrets and secrets["minio_endpoint"]:
        cfg.MINIO_ENDPOINT = secrets["minio_endpoint"]
    if "minio_access_key" in secrets and secrets["minio_access_key"]:
        cfg.MINIO_ACCESS_KEY = secrets["minio_access_key"]
    if "minio_secret_key" in secrets and secrets["minio_secret_key"]:
        cfg.MINIO_SECRET_KEY = secrets["minio_secret_key"]
    if "minio_secure" in secrets:
        cfg.MINIO_SECURE = secrets["minio_secure"]

    logger.info("Vault secrets applied to running configuration")
