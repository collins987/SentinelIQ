from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserOut(BaseModel):
    id: str
    org_id: str | None
    first_name: str
    last_name: str
    email: EmailStr
    role: str
    risk_score: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
