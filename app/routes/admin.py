from fastapi import APIRouter, Depends
from app.dependencies import require_role

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard")
def admin_dashboard(current_user = Depends(require_role("admin"))):
    return {"msg": f"Welcome, {current_user.first_name}!"}
