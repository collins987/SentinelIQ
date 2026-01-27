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
