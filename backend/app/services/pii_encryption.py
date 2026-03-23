"""
PII Encryption Service — Vault Transit Engine Integration

Encrypts personally identifiable information (PII) using Vault Transit:
- Per-user encryption keys (user_{id}) for GDPR crypto-shredding
- Graceful degradation: stores plaintext if Vault unavailable
- Transparent encrypt-on-write / decrypt-on-read

PII fields encrypted:  phone, first_name, last_name
Fields NOT encrypted:  email (needed for login lookups), password_hash (already hashed)

Crypto-shredding: Delete the Vault transit key for a user and all their
encrypted PII becomes permanently unreadable — GDPR Article 17 compliance.

Compliance: GDPR Article 25 (data protection by design), PCI-DSS 3.4
"""

import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("sentineliq.pii_encryption")

# Marker prefix so we know a value is Vault-encrypted
_VAULT_PREFIX = "vault:v"


def _get_vault():
    """Get the Vault client singleton (None if unavailable)."""
    try:
        from app.core.vault_client import get_vault_client
        vault = get_vault_client()
        if vault.is_authenticated():
            return vault
    except Exception:
        pass
    return None


def is_encrypted(value: Optional[str]) -> bool:
    """Check if a string value is Vault-encrypted ciphertext."""
    return bool(value and value.startswith(_VAULT_PREFIX))


def encrypt_pii_field(user_id: str, plaintext: Optional[str]) -> Optional[str]:
    """
    Encrypt a single PII field using the user's Vault Transit key.

    Returns:
        Ciphertext string (vault:v1:...) or the original plaintext if Vault
        is unavailable (graceful degradation).
    """
    if not plaintext:
        return plaintext

    vault = _get_vault()
    if not vault:
        return plaintext  # Graceful degradation

    key_name = f"user_{user_id}"
    try:
        ciphertext = vault.encrypt(key_name, plaintext)
        if ciphertext:
            return ciphertext
    except Exception as e:
        logger.warning(f"PII encryption failed for user {user_id}: {e}")

    return plaintext  # Fallback to plaintext


def decrypt_pii_field(user_id: str, ciphertext: Optional[str]) -> Optional[str]:
    """
    Decrypt a single PII field using the user's Vault Transit key.

    Returns:
        Plaintext string, or the original value if not encrypted / Vault unavailable.
    """
    if not ciphertext or not is_encrypted(ciphertext):
        return ciphertext  # Not encrypted or None

    vault = _get_vault()
    if not vault:
        logger.warning("Vault unavailable — cannot decrypt PII field")
        return "[encrypted]"  # Indicate data exists but can't be read

    key_name = f"user_{user_id}"
    try:
        plaintext = vault.decrypt(key_name, ciphertext)
        if plaintext:
            return plaintext
    except Exception as e:
        logger.warning(f"PII decryption failed for user {user_id}: {e}")

    return "[encrypted]"


def encrypt_user_pii(user_id: str, first_name: str, last_name: str,
                     phone: Optional[str] = None) -> Dict[str, Optional[str]]:
    """
    Encrypt all PII fields for a user.

    Returns dict with keys: first_name, last_name, phone
    Values are ciphertext if Vault available, plaintext otherwise.
    """
    return {
        "first_name": encrypt_pii_field(user_id, first_name),
        "last_name": encrypt_pii_field(user_id, last_name),
        "phone": encrypt_pii_field(user_id, phone),
    }


def decrypt_user_pii(user_id: str, first_name: Optional[str],
                     last_name: Optional[str],
                     phone: Optional[str] = None) -> Dict[str, Optional[str]]:
    """
    Decrypt all PII fields for a user.

    Returns dict with keys: first_name, last_name, phone
    """
    return {
        "first_name": decrypt_pii_field(user_id, first_name),
        "last_name": decrypt_pii_field(user_id, last_name),
        "phone": decrypt_pii_field(user_id, phone),
    }


def crypto_shred_user(user_id: str) -> bool:
    """
    Perform GDPR crypto-shredding: delete the user's Vault Transit key.

    After this call, all PII encrypted with this key becomes permanently
    unreadable. The ciphertext stays in the database but can never be
    decrypted again.

    Returns True if successful, False otherwise.
    """
    vault = _get_vault()
    if not vault:
        logger.error(f"Cannot crypto-shred user {user_id} — Vault unavailable")
        return False

    return vault.crypto_shred_user(user_id)
