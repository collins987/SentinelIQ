# app/routes/users.py
from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import User

router = APIRouter()

@router.get("/me", response_model=User)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
