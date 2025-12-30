# app/config.py
import os

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Short-lived access token
REFRESH_TOKEN_EXPIRE_DAYS = 7  # Longer-lived refresh token
MAX_SESSIONS_PER_USER = 3  # Limit concurrent sessions
MAX_LOGIN_ATTEMPTS = 5  # Failed attempts before lockout
LOGIN_ATTEMPT_WINDOW_MINUTES = 15  # Time window for rate limiting

# MILESTONE 6: Identity Hardening
EMAIL_TOKEN_EXPIRE_MINUTES = 24 * 60  # 24 hours (email verification)
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = 30  # 30 minutes (short for security)

# Email Configuration (Step 5)
EMAIL_FROM = os.getenv("EMAIL_FROM", "no-reply@sentineliq.local")
SMTP_HOST = os.getenv("SMTP_HOST", "mailhog")  # Docker service name
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))  # MailHog default
SMTP_USERNAME = os.getenv("SMTP_USERNAME", None)
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", None)
SMTP_TLS = os.getenv("SMTP_TLS", "false").lower() == "true"

# Frontend configuration for email links
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
