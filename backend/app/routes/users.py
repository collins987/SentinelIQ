"""
User Routes - JWT-authenticated, Swagger-compatible user management.
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Query,
    Body,
    Path,
    status,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import uuid

from app.dependencies import get_db
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserOut,
    UserListResponse,
    UserDetailResponse,
)
from app.models import User, AuditLog, Organization, UserStatus, UserVisibility
from app.services.user_service import (
    UserService,
    UserNotFoundError,
    UserVisibilityError,
)
from app.core.security import hash_password, verify_password
from app.services.token_service import create_access_token, decode_access_token


# ---------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------
router = APIRouter(prefix="/users", tags=["Users"])

# ---------------------------------------------------------------------
# User Dashboard Router (no prefix - for /user/* endpoints)
# ---------------------------------------------------------------------
from pydantic import BaseModel
from app.dependencies import get_current_user
from datetime import timedelta

user_router = APIRouter(tags=["User Dashboard"])

@user_router.get("/user/profile", summary="Get current user's profile")
def get_user_profile_root(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": f"{current_user.first_name} {current_user.last_name}",
        "email": current_user.email,
        "role": current_user.role,
    }

@user_router.get("/user/dashboard", summary="Get all user dashboard info (profile, risk, activity, session)")
def get_user_dashboard_root(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from sqlalchemy import desc, and_, func
    from app.models import Loan, SecurityAlert, UserSession
    now = datetime.utcnow()
    profile = {
        "id": current_user.id,
        "name": f"{current_user.first_name} {current_user.last_name}",
        "email": current_user.email,
        "role": current_user.role,
        "mfa_enabled": getattr(current_user, "mfa_enabled", False),
        "trust_level": getattr(current_user, "trust_level", "unknown"),
        "phone": getattr(current_user, "phone", None),
        "email_verified": getattr(current_user, "email_verified", False),
    }

    # Risk scores with domain breakdown
    risk_breakdown = getattr(current_user, "risk_breakdown", None) or {"identity": 0, "behavior": 0, "financial": 0, "compliance": 0}
    overall_score = getattr(current_user, "risk_score", 0) or 0

    risk_scores = [
        {
            "id": f"{current_user.id}_overall",
            "score": overall_score,
            "type": "overall",
            "suggestions": _get_risk_suggestions(overall_score, risk_breakdown, getattr(current_user, "mfa_enabled", False)),
        },
        {"id": f"{current_user.id}_identity", "score": risk_breakdown.get("identity", 0), "type": "identity", "suggestions": _get_domain_suggestions("identity", risk_breakdown.get("identity", 0), current_user)},
        {"id": f"{current_user.id}_behavior", "score": risk_breakdown.get("behavior", 0), "type": "behavior", "suggestions": _get_domain_suggestions("behavior", risk_breakdown.get("behavior", 0), current_user)},
        {"id": f"{current_user.id}_financial", "score": risk_breakdown.get("financial", 0), "type": "financial", "suggestions": _get_domain_suggestions("financial", risk_breakdown.get("financial", 0), current_user)},
        {"id": f"{current_user.id}_compliance", "score": risk_breakdown.get("compliance", 0), "type": "compliance", "suggestions": _get_domain_suggestions("compliance", risk_breakdown.get("compliance", 0), current_user)},
    ]

    recent_actions = db.query(AuditLog).filter(
        AuditLog.actor_id == current_user.id
    ).order_by(desc(AuditLog.timestamp)).limit(10).all()
    cutoff_24h = now - timedelta(hours=24)
    failed_logins = db.query(func.count(AuditLog.id)).filter(
        and_(
            AuditLog.actor_id == current_user.id,
            AuditLog.action == "login_failed",
            AuditLog.timestamp >= cutoff_24h
        )
    ).scalar() or 0

    # Session info
    active_sessions_count = db.query(func.count(UserSession.id)).filter(
        UserSession.user_id == current_user.id,
        UserSession.revoked == False
    ).scalar() or 0

    session_info = {
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        "last_login_ip": current_user.last_login_ip,
        "last_device_info": current_user.last_device_info,
        "active_sessions": active_sessions_count if active_sessions_count > 0 else (
            db.query(func.count()).select_from(AuditLog).filter(
                AuditLog.actor_id == current_user.id,
                AuditLog.action == "login_success",
                AuditLog.timestamp >= cutoff_24h
            ).scalar() or 0
        ),
    }

    # Loans summary
    try:
        loans = db.query(Loan).filter(Loan.user_id == current_user.id).all()
        active_loans = [l for l in loans if l.status in ("active", "pending")]
        loans_summary = {
            "total_loans": len(loans),
            "active_loans": len(active_loans),
            "total_outstanding": sum(float(l.outstanding or 0) for l in active_loans),
            "next_due_date": min((l.next_due_date.isoformat() for l in active_loans if l.next_due_date), default=None),
        }
    except Exception:
        loans_summary = {"total_loans": 0, "active_loans": 0, "total_outstanding": 0, "next_due_date": None}

    # Alerts summary
    try:
        unread_alerts = db.query(func.count(SecurityAlert.id)).filter(
            SecurityAlert.user_id == current_user.id,
            SecurityAlert.is_read == False,
            SecurityAlert.is_dismissed == False
        ).scalar() or 0
        alerts_summary = {"unread": unread_alerts}
    except Exception:
        alerts_summary = {"unread": 0}

    import json
    return {
        "profile": profile,
        "risk_scores": risk_scores,
        "risk_breakdown": risk_breakdown,
        "trust_level": getattr(current_user, "trust_level", "unknown") or "unknown",
        "activity": {
            "failed_logins_24h": failed_logins,
            "recent_actions": [
                {
                    "action": log.action,
                    "target": log.target if isinstance(log.target, str) or log.target is None else json.dumps(log.target),
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None
                }
                for log in recent_actions
            ]
        },
        "session": session_info,
        "loans_summary": loans_summary,
        "alerts_summary": alerts_summary,
    }


def _get_risk_suggestions(score: int, breakdown: dict, mfa_enabled: bool) -> list:
    """Generate contextual risk mitigation suggestions based on current state."""
    suggestions = []
    if not mfa_enabled:
        suggestions.append("Enable MFA to reduce identity risk by 30 points")
    if breakdown.get("financial", 0) > 50:
        suggestions.append("Make on-time loan repayments to reduce financial risk")
    if breakdown.get("behavior", 0) > 50:
        suggestions.append("Maintain consistent login patterns to improve behavioral score")
    if breakdown.get("identity", 0) > 50:
        suggestions.append("Verify your email and phone to strengthen identity trust")
    if score > 600:
        suggestions.append("Contact support if you believe your risk score is incorrect")
    if not suggestions:
        suggestions.append("Your risk profile looks healthy — keep up the good practices!")
    return suggestions


def _get_domain_suggestions(domain: str, score: int, user) -> list:
    """Get domain-specific risk suggestions."""
    s = []
    if domain == "identity":
        if not getattr(user, "mfa_enabled", False):
            s.append("Enable MFA for stronger identity verification")
        if not getattr(user, "email_verified", False):
            s.append("Verify your email address")
        if not getattr(user, "phone_verified", False):
            s.append("Add and verify a phone number")
    elif domain == "behavior":
        if score > 30:
            s.append("Avoid rapid password changes")
            s.append("Log in from consistent devices and locations")
    elif domain == "financial":
        if score > 30:
            s.append("Make loan repayments on time")
            s.append("Avoid exceeding transaction thresholds")
    elif domain == "compliance":
        if score > 30:
            s.append("Complete KYC verification")
            s.append("Ensure transactions meet regulatory requirements")
    if not s:
        s.append(f"Your {domain} risk is low — no action needed")
    return s

# ---------------------------------------------------------------------
# User Profile Endpoint (legacy /users/profile)
# ---------------------------------------------------------------------
@router.get("/profile", summary="Get current user's profile")
def get_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": f"{current_user.first_name} {current_user.last_name}",
        "email": current_user.email,
        "role": current_user.role,
    }

# ---------------------------------------------------------------------
# Support Ticket Endpoint (for user dashboard)
# ---------------------------------------------------------------------
class SupportTicketIn(BaseModel):
    message: str
    email: str

@router.post("/support/ticket", summary="Submit a support ticket")
def submit_support_ticket(
    ticket: SupportTicketIn = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # For demo: just log the ticket, in production store or send to admin
    db.add(AuditLog(
        id=str(uuid.uuid4()),
        actor_id=current_user.id,
        action="support_ticket_submitted",
        target=current_user.id,
        event_metadata={"email": ticket.email, "message": ticket.message},
        timestamp=datetime.utcnow(),
    ))
    db.commit()
    return {"success": True}

# ---------------------------------------------------------------------
# User Activity Endpoint (for user dashboard)
# ---------------------------------------------------------------------
@router.get("/user/activity", summary="Get current user's recent activity and session info")
def get_user_activity(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from sqlalchemy import desc, and_, func
    now = datetime.utcnow()
    # Get recent activity logs (last 10 actions)
    recent_actions = db.query(AuditLog).filter(
        AuditLog.actor_id == current_user.id
    ).order_by(desc(AuditLog.timestamp)).limit(10).all()
    # Get failed login attempts in last 24h
    cutoff_24h = now - timedelta(hours=24)
    failed_logins = db.query(func.count(AuditLog.id)).filter(
        and_(
            AuditLog.actor_id == current_user.id,
            AuditLog.action == "login_failed",
            AuditLog.timestamp >= cutoff_24h
        )
    ).scalar() or 0
    # Get session info
    session_info = {
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        "last_login_ip": current_user.last_login_ip,
        "last_device_info": current_user.last_device_info,
        "active_sessions": db.query(func.count()).select_from(AuditLog).filter(
            AuditLog.actor_id == current_user.id,
            AuditLog.action == "login_success",
            AuditLog.timestamp >= cutoff_24h
        ).scalar() or 0
    }
    import json
    return {
        "activity": {
            "failed_logins_24h": failed_logins,
            "recent_actions": [
                {
                    "action": log.action,
                    "target": log.target if isinstance(log.target, str) or log.target is None else json.dumps(log.target),
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None
                }
                for log in recent_actions
            ]
        },
        "session": session_info
    }

# ---------------------------------------------------------------------
# User Dashboard Summary Endpoint (for user dashboard)
# ---------------------------------------------------------------------
# ---------------------------------------------------------------------
# Security — JWT Bearer ONLY
# ---------------------------------------------------------------------
security = HTTPBearer()  # auto_error=True (default)

# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def _get_request_context(request: Optional[Request]) -> dict:
    if not request:
        return {}
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent", "unknown"),
        "request_path": str(request.url.path),
    }

# ---------------------------------------------------------------------
# Current User Dependency
# ---------------------------------------------------------------------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Reads Authorization: Bearer <access_token>
    Decodes JWT and returns authenticated user.
    """

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme. Bearer token required.",
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id: Optional[str] = payload.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        user = db.query(User).filter(User.id == user_id).first()

        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")

        return user

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

# ---------------------------------------------------------------------
# Authentication (Login — JWT Issuer)
# ---------------------------------------------------------------------
@router.post("/auth/login", summary="Authenticate user and obtain JWT")
def login(
    email: str = Body(..., embed=True),
    password: str = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    """
    Standard login endpoint.
    Accepts JSON body.
    Returns JWT access token.
    """

    from app.config import DEV_MODE, ADMIN_EMAIL, ADMIN_PASSWORD, TEST_USER_EMAIL, TEST_USER_PASSWORD

    # Universal admin login (not stored in DB)
    if DEV_MODE and email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
        return {
            "access_token": create_access_token({
                "sub": "admin-bootstrap",
                "role": "admin",
                "org_id": None,
            }),
            "token_type": "bearer"
        }

    # Dummy test user login (DEV_MODE only)
    if DEV_MODE and email == TEST_USER_EMAIL and password == TEST_USER_PASSWORD:
        return {
            "access_token": create_access_token({
                "sub": "test-user",
                "role": "viewer",
                "org_id": None,
            }),
            "token_type": "bearer"
        }

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
            "org_id": user.org_id,
        }
    )

    return {"access_token": access_token, "token_type": "bearer"}

# ---------------------------------------------------------------------
# Get current authenticated user
# ---------------------------------------------------------------------
@router.get("/me", response_model=UserOut, summary="Get current authenticated user")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ---------------------------------------------------------------------
# List Users
# ---------------------------------------------------------------------
@router.get("/", response_model=UserListResponse, summary="List users")
def list_users(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    org_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    service = UserService(db)
    ctx = _get_request_context(request)

    return service.list_users(
        accessor=current_user,
        page=page,
        page_size=page_size,
        org_filter=org_id,
        status_filter=status,
        **ctx,
    )

# ---------------------------------------------------------------------
# Get User by ID
# ---------------------------------------------------------------------
@router.get("/{user_id}", response_model=UserDetailResponse, summary="Get user by ID")
def get_user(
    request: Request,
    user_id: str = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db)
    ctx = _get_request_context(request)

    try:
        user = service.get_user_by_id(
            user_id=user_id,
            accessor=current_user,
            **ctx,
        )
        return {"user": user}

    except UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except UserVisibilityError as e:
        raise HTTPException(status_code=403, detail=str(e))

# ---------------------------------------------------------------------
# Update User (PATCH — FIXED)
# ---------------------------------------------------------------------
@router.patch("/{user_id}", response_model=UserOut, summary="Update user")
async def update_user(
    request: Request,
    user_id: str = Path(...),
    payload: UserUpdate = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Permission: user can update self, admin can update anyone
    if user.id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    raw_body = await request.json()
    update_data = payload.dict(exclude_unset=True)

    # 🔒 Risk score protection — ONLY if client ACTUALLY sets a value and is changing it
    if "risk_score" in raw_body:
        incoming_risk = raw_body.get("risk_score")
        if incoming_risk is not None and incoming_risk != user.risk_score:
            if current_user.role not in ("admin", "analyst"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot modify risk score",
                )

    # Apply updates safely
    for field, value in update_data.items():
        setattr(user, field, value)

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    return user

# ---------------------------------------------------------------------
# Register User
# ---------------------------------------------------------------------
@router.post("/", response_model=UserOut, status_code=201, summary="Register new user")
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    org_id: Optional[str] = None

    if payload.org_id:
        org_id = str(payload.org_id)
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            org = Organization(
                id=org_id,
                name=f"Organization {org_id}",
                created_at=datetime.utcnow(),
            )
            db.add(org)
            db.flush()

    new_user = User(
        id=str(uuid.uuid4()),
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role or "viewer",
        status=UserStatus.ACTIVE.value,
        visibility=UserVisibility.ORGANIZATION.value,
        org_id=org_id,
        email_verified=True,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    db.add(
        AuditLog(
            id=str(uuid.uuid4()),
            actor_id=new_user.id,
            action="user_registered",
            target=new_user.id,
            event_metadata={"email": new_user.email, "org_id": org_id},
            timestamp=datetime.utcnow(),
        )
    )
    db.commit()

    return new_user
