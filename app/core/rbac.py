# RBAC Authorization System for SentinelIQ

from enum import Enum
from typing import Dict, List, Set
from functools import wraps
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.models import User
from app.database import get_db

# ========== ROLE DEFINITIONS ==========

class Role(str, Enum):
    """6-role structure reflecting real financial organization."""
    ADMIN = "admin"                        # 👑 Full system access
    RISK_ANALYST = "risk_analyst"          # 🕵️ Fraud investigation
    COMPLIANCE_OFFICER = "compliance_officer"  # 👮 Audit & regulatory
    SOC_RESPONDER = "soc_responder"        # 🛡️ Real-time incident response
    DATA_SCIENTIST = "data_scientist"      # 🧪 ML model development
    BACKEND_ENGINEER = "backend_engineer"  # 👷 API integration


# ========== PERMISSION DEFINITIONS ==========

class Permission(str, Enum):
    """Fine-grained permissions for resources."""
    
    # Event access
    EVENT_READ = "event:read"
    EVENT_WRITE = "event:write"
    EVENT_DELETE = "event:delete"
    
    # Risk analysis
    RISK_READ = "risk:read"
    RISK_WRITE = "risk:write"
    RISK_REVIEW = "risk:review"
    
    # Audit & compliance
    AUDIT_READ = "audit:read"
    AUDIT_EXPORT = "audit:export"
    
    # Rules
    RULE_READ = "rule:read"
    RULE_WRITE = "rule:write"
    RULE_SHADOW = "rule:shadow"  # Shadow mode evaluation
    
    # Cases & incidents
    CASE_READ = "case:read"
    CASE_WRITE = "case:write"
    INCIDENT_READ = "incident:read"
    INCIDENT_WRITE = "incident:write"
    
    # Link analysis (graph)
    LINK_READ = "link:read"
    LINK_WRITE = "link:write"
    
    # User management
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"
    
    # Integration management
    INTEGRATION_READ = "integration:read"
    INTEGRATION_WRITE = "integration:write"
    INTEGRATION_DELETE = "integration:delete"
    
    # System administration
    SYSTEM_CONFIG = "system:config"
    SYSTEM_MONITORING = "system:monitoring"


# ========== ROLE-PERMISSION MATRIX ==========

ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.ADMIN: {
        # Full access to everything
        Permission.EVENT_READ, Permission.EVENT_WRITE, Permission.EVENT_DELETE,
        Permission.RISK_READ, Permission.RISK_WRITE, Permission.RISK_REVIEW,
        Permission.AUDIT_READ, Permission.AUDIT_EXPORT,
        Permission.RULE_READ, Permission.RULE_WRITE, Permission.RULE_SHADOW,
        Permission.CASE_READ, Permission.CASE_WRITE,
        Permission.INCIDENT_READ, Permission.INCIDENT_WRITE,
        Permission.LINK_READ, Permission.LINK_WRITE,
        Permission.USER_READ, Permission.USER_WRITE, Permission.USER_DELETE,
        Permission.INTEGRATION_READ, Permission.INTEGRATION_WRITE, Permission.INTEGRATION_DELETE,
        Permission.SYSTEM_CONFIG, Permission.SYSTEM_MONITORING,
    },
    
    Role.RISK_ANALYST: {
        # Investigation and case management
        Permission.EVENT_READ,
        Permission.RISK_READ, Permission.RISK_WRITE, Permission.RISK_REVIEW,
        Permission.CASE_READ, Permission.CASE_WRITE,
        Permission.LINK_READ, Permission.LINK_WRITE,
        Permission.RULE_READ,
    },
    
    Role.COMPLIANCE_OFFICER: {
        # Audit and regulatory reporting
        Permission.AUDIT_READ, Permission.AUDIT_EXPORT,
        Permission.EVENT_READ,
        Permission.RISK_READ,
        Permission.RULE_READ,
    },
    
    Role.SOC_RESPONDER: {
        # Real-time incident response
        Permission.EVENT_READ,
        Permission.RISK_READ, Permission.RISK_REVIEW,
        Permission.INCIDENT_READ, Permission.INCIDENT_WRITE,
        Permission.LINK_READ,
        Permission.RULE_READ,
        Permission.SYSTEM_MONITORING,
    },
    
    Role.DATA_SCIENTIST: {
        # Model development and testing
        Permission.EVENT_READ,
        Permission.RISK_READ,
        Permission.RULE_READ, Permission.RULE_SHADOW,  # Shadow mode access
        Permission.LINK_READ,
    },
    
    Role.BACKEND_ENGINEER: {
        # API integration only
        Permission.EVENT_READ, Permission.EVENT_WRITE,
        Permission.RISK_READ,
    },
}


# ========== RESOURCE-LEVEL PERMISSIONS ==========

def has_organization_access(user: User, org_id: str) -> bool:
    """Check if user's organization matches requested org."""
    return user.org_id == org_id


def can_access_own_data_only(user: User, target_user_id: str) -> bool:
    """Check if user can only access their own data."""
    if user.role == Role.ADMIN:
        return True
    return user.id == target_user_id


def can_access_org_data(user: User, target_org_id: str) -> bool:
    """Check if user can access organization data."""
    if user.role == Role.ADMIN:
        return True
    return user.org_id == target_org_id


# ========== AUTHORIZATION DECORATORS ==========

def require_permission(permission: Permission):
    """Decorator: Require specific permission."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(), **kwargs):
            user_permissions = ROLE_PERMISSIONS.get(Role(current_user.role), set())
            
            if permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permission: {permission.value}"
                )
            
            return await func(*args, current_user=current_user, **kwargs)
        
        return wrapper
    return decorator


def require_role(*allowed_roles: Role):
    """Decorator: Require one of specified roles."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(), **kwargs):
            if Role(current_user.role) not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required roles: {', '.join([r.value for r in allowed_roles])}"
                )
            
            return await func(*args, current_user=current_user, **kwargs)
        
        return wrapper
    return decorator


def require_org_access(func):
    """Decorator: Verify user has access to requested organization."""
    def decorator(org_id: str):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(), **kwargs):
            if not can_access_org_data(current_user, org_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to organization"
                )
            
            return await func(*args, current_user=current_user, **kwargs)
        
        return wrapper
    return decorator


# ========== PERMISSION CHECKING FUNCTIONS ==========

def check_permission(user: User, permission: Permission) -> bool:
    """Check if user has a specific permission."""
    user_permissions = ROLE_PERMISSIONS.get(Role(user.role), set())
    return permission in user_permissions


def check_role(user: User, role: Role) -> bool:
    """Check if user has a specific role."""
    return user.role == role.value


def get_user_permissions(user: User) -> Set[Permission]:
    """Get all permissions for a user."""
    return ROLE_PERMISSIONS.get(Role(user.role), set())


# ========== RESOURCE ACCESS CONTROL ==========

class ResourceACL:
    """Resource-level access control."""
    
    @staticmethod
    def can_view_event(user: User, event_org_id: str) -> bool:
        """Can user view an event?"""
        if not has_organization_access(user, event_org_id):
            return False
        return Permission.EVENT_READ in get_user_permissions(user)
    
    @staticmethod
    def can_create_case(user: User, org_id: str) -> bool:
        """Can user create a case?"""
        if not has_organization_access(user, org_id):
            return False
        return Permission.CASE_WRITE in get_user_permissions(user)
    
    @staticmethod
    def can_access_shadow_rules(user: User) -> bool:
        """Can user access shadow mode rules?"""
        return Permission.RULE_SHADOW in get_user_permissions(user)
    
    @staticmethod
    def can_export_audit_logs(user: User) -> bool:
        """Can user export audit logs?"""
        return Permission.AUDIT_EXPORT in get_user_permissions(user)
    
    @staticmethod
    def can_modify_rules(user: User) -> bool:
        """Can user modify rules?"""
        return Permission.RULE_WRITE in get_user_permissions(user)
    
    @staticmethod
    def can_create_incident(user: User) -> bool:
        """Can user create incidents?"""
        return Permission.INCIDENT_WRITE in get_user_permissions(user)


# ========== ROLE INFORMATION ==========

ROLE_DESCRIPTIONS = {
    Role.ADMIN: "Full system access - manages RBAC, secrets, configuration",
    Role.RISK_ANALYST: "Fraud investigation - reviews flagged transactions, creates cases",
    Role.COMPLIANCE_OFFICER: "Audit & regulatory - generates compliance reports",
    Role.SOC_RESPONDER: "Incident response - responds to active attacks, real-time dashboards",
    Role.DATA_SCIENTIST: "ML development - trains models, tests rules in shadow mode",
    Role.BACKEND_ENGINEER: "API integration - integrates banking core with SentinelIQ",
}

ROLE_ICONS = {
    Role.ADMIN: "👑",
    Role.RISK_ANALYST: "🕵️",
    Role.COMPLIANCE_OFFICER: "👮",
    Role.SOC_RESPONDER: "🛡️",
    Role.DATA_SCIENTIST: "🧪",
    Role.BACKEND_ENGINEER: "👷",
}
