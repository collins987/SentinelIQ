"""
SentinelIQ Dependency Injection Module

Provides:
- Database session management
- JWT token validation (supports both DB users and virtual users)
- Role-based access control (RBAC)
- Permission-based access control
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Union
import uuid

from app.models import User, AuditLog
from app.core.db import SessionLocal
from app.config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ADMIN_EMAIL,
    TEST_USER_EMAIL,
    DEV_MODE,
)

security = HTTPBearer()


# ============================================================================
# Database Dependency
# ============================================================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# Virtual User Class (for non-DB authentication)
# ============================================================================

class VirtualUser:
    """
    Virtual user class for admin/test users authenticated via environment credentials.
    Mimics the User model interface for compatibility.
    """

    def __init__(
        self,
        id: str,
        email: str,
        role: str,
        first_name: str = "Virtual",
        last_name: str = "User",
    ):
        self.id = id
        self.email = email
        self.role = role
        self.first_name = first_name
        self.last_name = last_name
        self.is_active = True
        self.email_verified = True
        self.is_virtual = True
        self.org_id = "00000000-0000-0000-0000-000000000000"


# ============================================================================
# Current User Dependency (JWT)
# ============================================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Union[User, VirtualUser]:
    """
    Validate JWT token and return the authenticated user.
    Supports:
    - Database-backed users
    - Virtual users (admin/test users from environment credentials)
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials or not credentials.credentials:
        raise credentials_exception

    token = credentials.credentials

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        user_role: str = payload.get("role", "viewer")
        user_email: str = payload.get("email", "")
        is_virtual: bool = payload.get("is_virtual", False)

        if not user_id:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # ------------------------------------------------------------------
    # Virtual Users (Admin / Test)
    # ------------------------------------------------------------------

    if is_virtual:
        if user_email.lower() == ADMIN_EMAIL.lower():
            return VirtualUser(
                id=user_id,
                email=user_email,
                role="admin",
                first_name="System",
                last_name="Administrator",
            )

        if DEV_MODE and user_email.lower() == TEST_USER_EMAIL.lower():
            return VirtualUser(
                id=user_id,
                email=user_email,
                role="viewer",
                first_name="Test",
                last_name="User",
            )

        raise credentials_exception

    # ------------------------------------------------------------------
    # Database Users
    # ------------------------------------------------------------------

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled",
        )

    return user


# ============================================================================
# Email Verification Guard (for sensitive operations)
# ============================================================================

def require_verified_email(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that requires the user's email to be verified.
    Use on sensitive endpoints (financial ops, settings changes, etc.).
    Basic dashboard / profile access should NOT require this.
    """
    if getattr(current_user, "is_virtual", False):
        return current_user  # Virtual users are always "verified"

    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email to continue.",
        )
    return current_user


# ============================================================================
# Simple Admin Guard
# ============================================================================

def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


# ============================================================================
# RBAC: Role-Based Access Control
# ============================================================================

def _log_forbidden_access(
    user_id: str,
    required_roles: list[str],
    user_role: str,
    db: Session,
):
    """Log forbidden access attempts for security audit trail."""
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=user_id,
        action="forbidden_access",
        target="route_access",
        event_metadata={
            "required_roles": required_roles,
            "user_role": user_role,
            "reason": "Insufficient role/permissions",
        },
        timestamp=datetime.utcnow(),
    )
    db.add(audit)
    db.commit()


def require_role(required_roles: list[str] | str):
    """
    Dependency to enforce role-based access control.
    """

    if isinstance(required_roles, str):
        required_roles = [required_roles]

    def role_checker(
        current_user: Union[User, VirtualUser] = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        if current_user.role not in required_roles:
            if not getattr(current_user, "is_virtual", False):
                _log_forbidden_access(
                    current_user.id,
                    required_roles,
                    current_user.role,
                    db,
                )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(required_roles)}",
            )

        return current_user

    return role_checker


# ============================================================================
# Permission-Based Access Control
# ============================================================================

def require_permission(permission: str):
    """
    Dependency to enforce permission-based access control.
    """

    from app.config import PERMISSION_ROLES

    allowed_roles = PERMISSION_ROLES.get(permission)
    if not allowed_roles:
        raise ValueError(f"Permission '{permission}' not found in configuration")

    def permission_checker(
        current_user: Union[User, VirtualUser] = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        if current_user.role not in allowed_roles:
            if not getattr(current_user, "is_virtual", False):
                _log_forbidden_access(
                    current_user.id,
                    allowed_roles,
                    current_user.role,
                    db,
                )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Insufficient permissions for '{permission}'. "
                    f"Required roles: {', '.join(allowed_roles)}"
                ),
            )

        return current_user

    return permission_checker
