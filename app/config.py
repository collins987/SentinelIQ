# app/config.py
import os

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Short-lived access token
REFRESH_TOKEN_EXPIRE_DAYS = 7  # Longer-lived refresh token
MAX_SESSIONS_PER_USER = 3  # Limit concurrent sessions
MAX_LOGIN_ATTEMPTS = 5  # Failed attempts before lockout
LOGIN_ATTEMPT_WINDOW_MINUTES = 15  # Time window for rate limiting
