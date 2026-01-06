# PII Scrubbing Middleware for SentinelIQ
# Regex-based masking for sensitive data before logging

import re
import json
from typing import Any, Dict, Union
from functools import lru_cache

# ========== PII PATTERN DEFINITIONS ==========

class PIIPatterns:
    """Regular expressions for common PII patterns."""
    
    # Credit card patterns (Visa, Mastercard, Amex, Discover)
    CREDIT_CARD = re.compile(
        r'\b(?:\d{4}[\s\-]?){3}\d{4}\b',  # XXXX-XXXX-XXXX-XXXX
        re.IGNORECASE
    )
    
    # Social Security Number
    SSN = re.compile(
        r'\b\d{3}-\d{2}-\d{4}\b'
    )
    
    # Email address
    EMAIL = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    )
    
    # Phone number (US format)
    PHONE = re.compile(
        r'(?:\+?1)?[\s.-]?\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}\b'
    )
    
    # Password fields (JSON: "password": "value")
    PASSWORD_JSON = re.compile(
        r'"(?:password|passwd|pwd|secret|api_key|token)"\s*:\s*"[^"]*"',
        re.IGNORECASE
    )
    
    # Authorization headers
    AUTH_HEADER = re.compile(
        r'(?:Bearer|Basic|Bearer)\s+[A-Za-z0-9\-._~+/]+=*',
        re.IGNORECASE
    )
    
    # Bank account numbers
    ACCOUNT_NUMBER = re.compile(
        r'\b(?:account|acct)\s*[#:]?\s*\d{8,17}\b',
        re.IGNORECASE
    )
    
    # Credit card expiry (MM/YY or MM-YY)
    CARD_EXPIRY = re.compile(
        r'\b(0[1-9]|1[0-2])/(\d{2})\b'
    )
    
    # CVV/CVC
    CVV = re.compile(
        r'(?:cvv|cvc|cid)\s*[#:]?\s*\d{3,4}\b',
        re.IGNORECASE
    )
    
    # IBAN (International Bank Account Number)
    IBAN = re.compile(
        r'\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b'
    )


# ========== REDACTION MASKS ==========

class RedactionMasks:
    """Standard redaction messages."""
    CREDIT_CARD = "[REDACTED_CC]"
    SSN = "[REDACTED_SSN]"
    EMAIL = "[REDACTED_EMAIL]"
    PHONE = "[REDACTED_PHONE]"
    PASSWORD = "[REDACTED_PASSWORD]"
    AUTH = "[REDACTED_AUTH]"
    ACCOUNT = "[REDACTED_ACCOUNT]"
    EXPIRY = "[REDACTED_EXPIRY]"
    CVV = "[REDACTED_CVV]"
    IBAN = "[REDACTED_IBAN]"


# ========== PII SCRUBBER ==========

class PIIScrubber:
    """Scrub PII from strings, JSON, and objects."""
    
    @staticmethod
    def scrub_string(text: str) -> str:
        """Scrub PII from a plain text string."""
        if not isinstance(text, str):
            return text
        
        # Credit card
        text = PIIPatterns.CREDIT_CARD.sub(RedactionMasks.CREDIT_CARD, text)
        
        # SSN
        text = PIIPatterns.SSN.sub(RedactionMasks.SSN, text)
        
        # Email
        text = PIIPatterns.EMAIL.sub(RedactionMasks.EMAIL, text)
        
        # Phone
        text = PIIPatterns.PHONE.sub(RedactionMasks.PHONE, text)
        
        # Password
        text = PIIPatterns.PASSWORD_JSON.sub(
            r'"password": "' + RedactionMasks.PASSWORD + '"',
            text
        )
        
        # Auth headers
        text = PIIPatterns.AUTH_HEADER.sub(RedactionMasks.AUTH, text)
        
        # Account number
        text = PIIPatterns.ACCOUNT_NUMBER.sub(RedactionMasks.ACCOUNT, text)
        
        # Card expiry
        text = PIIPatterns.CARD_EXPIRY.sub(RedactionMasks.EXPIRY, text)
        
        # CVV
        text = PIIPatterns.CVV.sub(RedactionMasks.CVV, text)
        
        # IBAN
        text = PIIPatterns.IBAN.sub(RedactionMasks.IBAN, text)
        
        return text
    
    @staticmethod
    def scrub_json(obj: Union[dict, list, str]) -> Union[dict, list, str]:
        """
        Recursively scrub PII from JSON objects.
        Handles nested structures (dicts, lists).
        """
        if isinstance(obj, str):
            return PIIScrubber.scrub_string(obj)
        
        elif isinstance(obj, dict):
            scrubbed = {}
            for key, value in obj.items():
                # Scrub sensitive field names
                if any(sensitive in key.lower() for sensitive in 
                       ['password', 'secret', 'token', 'api_key', 'credit_card', 
                        'cvv', 'ssn', 'account', 'iban']):
                    scrubbed[key] = RedactionMasks.PASSWORD
                else:
                    scrubbed[key] = PIIScrubber.scrub_json(value)
            return scrubbed
        
        elif isinstance(obj, list):
            return [PIIScrubber.scrub_json(item) for item in obj]
        
        else:
            return obj
    
    @staticmethod
    def scrub_dict(data: Dict[str, Any]) -> Dict[str, Any]:
        """Scrub PII from a dictionary."""
        return PIIScrubber.scrub_json(data)


# ========== LOGGING HELPER ==========

def log_safe(data: Union[str, dict, list]) -> Union[str, dict, list]:
    """
    Safe logging function that scrubs PII before returning log-safe data.
    Usage:
        logger.info(f"Event: {log_safe(event_data)}")
    """
    if isinstance(data, str):
        return PIIScrubber.scrub_string(data)
    elif isinstance(data, (dict, list)):
        return PIIScrubber.scrub_json(data)
    return data


# ========== MIDDLEWARE ==========

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import logging

logger = logging.getLogger(__name__)


class PIIScrubbingMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware to scrub PII from request/response bodies in logs.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Log request (scrubbed)
        try:
            body = await request.body()
            if body:
                try:
                    request_data = json.loads(body)
                    scrubbed_request = PIIScrubber.scrub_json(request_data)
                    logger.debug(f"[REQUEST] {request.method} {request.url.path}: {scrubbed_request}")
                except json.JSONDecodeError:
                    # Not JSON, scrub as string
                    scrubbed_body = PIIScrubber.scrub_string(body.decode('utf-8', errors='ignore'))
                    logger.debug(f"[REQUEST] {request.method} {request.url.path}: {scrubbed_body}")
        except Exception as e:
            logger.debug(f"[REQUEST] Could not scrub request body: {e}")
        
        # Call next middleware
        response = await call_next(request)
        
        # Log response (scrubbed) - for error responses only
        if response.status_code >= 400:
            try:
                body = b""
                async for chunk in response.body_iterator:
                    body += chunk
                if body:
                    try:
                        response_data = json.loads(body)
                        scrubbed_response = PIIScrubber.scrub_json(response_data)
                        logger.debug(f"[RESPONSE] {response.status_code}: {scrubbed_response}")
                    except json.JSONDecodeError:
                        scrubbed_body = PIIScrubber.scrub_string(body.decode('utf-8', errors='ignore'))
                        logger.debug(f"[RESPONSE] {response.status_code}: {scrubbed_body}")
            except Exception as e:
                logger.debug(f"[RESPONSE] Could not scrub response body: {e}")
        
        return response


# ========== TESTING HELPERS ==========

def is_pii_present(text: str) -> Dict[str, bool]:
    """Check what types of PII are present in text."""
    return {
        "credit_card": bool(PIIPatterns.CREDIT_CARD.search(text)),
        "ssn": bool(PIIPatterns.SSN.search(text)),
        "email": bool(PIIPatterns.EMAIL.search(text)),
        "phone": bool(PIIPatterns.PHONE.search(text)),
        "password": bool(PIIPatterns.PASSWORD_JSON.search(text)),
        "auth_header": bool(PIIPatterns.AUTH_HEADER.search(text)),
        "account": bool(PIIPatterns.ACCOUNT_NUMBER.search(text)),
        "iban": bool(PIIPatterns.IBAN.search(text)),
    }
