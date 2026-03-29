"""
Milestone 7: RBAC Usage Examples

Practical examples of implementing role-based access control in your routes.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.dependencies import require_role, require_permission, get_current_user, get_db
from app.models import User, AuditLog
from app.config import ROLES

