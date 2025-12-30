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
SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))  # MailHog default
SMTP_USERNAME = os.getenv("SMTP_USERNAME", None)
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", None)
SMTP_TLS = os.getenv("SMTP_TLS", "false").lower() == "true"

# Frontend configuration for email links
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

# MILESTONE 7: Role-Based Access Control (RBAC)
# Role hierarchy: admin > analyst > viewer
ROLES = {
    "admin": {
        "description": "Full system access - manage users, settings, audit logs",
        "permissions": [
            "admin.dashboard",
            "admin.disable_user",
            "admin.enable_user",
            "admin.view_audit_logs",
            "admin.manage_organization",
            "users.create",
            "users.read_all",
            "users.update_any",
            "users.delete_any",
            "analytics.read",
            "analytics.write",
            "profile.read_own",
            "profile.update_own",
        ]
    },
    "analyst": {
        "description": "Data analysis access - read/write analysis, view reports",
        "permissions": [
            "analytics.read",
            "analytics.write",
            "analytics.export",
            "profile.read_own",
            "profile.update_own",
            "users.read_own_org",
        ]
    },
    "viewer": {
        "description": "Read-only access - view own profile and limited data",
        "permissions": [
            "profile.read_own",
            "profile.update_own",
        ]
    }
}

# Permission-to-role mapping (reverse lookup)
PERMISSION_ROLES = {}
for role, config in ROLES.items():
    for permission in config.get("permissions", []):
        if permission not in PERMISSION_ROLES:
            PERMISSION_ROLES[permission] = []
        PERMISSION_ROLES[permission].append(role)
