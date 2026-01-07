from sqlalchemy.orm import Session
from app.models import Organization, User
from app.core.constants import DEFAULT_ORG_ID, DEFAULT_ORG_NAME
from app.core.security import hash_password
from app.core.logging import logger
import uuid

def seed_default_org(db: Session):
    org = db.query(Organization).filter(
        Organization.id == DEFAULT_ORG_ID
    ).first()

    if not org:
        org = Organization(
            id=DEFAULT_ORG_ID,
            name=DEFAULT_ORG_NAME
        )
        db.add(org)
        db.commit()
        logger.info(f"Created default organization: {DEFAULT_ORG_NAME}")


def seed_default_users(db: Session):
    """
    Seed default users for development and testing.
    Creates an admin user if none exists.
    """
    # Check if admin user already exists
    admin_email = "admin@sentineliq.com"
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    
    if not existing_admin:
        admin_user = User(
            id=str(uuid.uuid4()),
            email=admin_email,
            first_name="Admin",
            last_name="User",
            password_hash=hash_password("password"),  # Default password for development
            role="admin",
            is_active=True,
            email_verified=True,  # Pre-verified for convenience
            org_id=DEFAULT_ORG_ID,
        )
        db.add(admin_user)
        db.commit()
        logger.info(f"Created default admin user: {admin_email} (password: 'password')")
    
    # Create other demo users if they don't exist
    demo_users = [
        {"email": "analyst@sentineliq.com", "first_name": "Risk", "last_name": "Analyst", "role": "analyst"},
        {"email": "soc@sentineliq.com", "first_name": "SOC", "last_name": "Responder", "role": "soc_responder"},
        {"email": "scientist@sentineliq.com", "first_name": "Data", "last_name": "Scientist", "role": "data_scientist"},
        {"email": "dev@sentineliq.com", "first_name": "Dev", "last_name": "User", "role": "developer"},
        {"email": "compliance@sentineliq.com", "first_name": "Compliance", "last_name": "Officer", "role": "compliance"},
        {"email": "user@sentineliq.com", "first_name": "End", "last_name": "User", "role": "viewer"},
    ]
    
    for user_data in demo_users:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            new_user = User(
                id=str(uuid.uuid4()),
                email=user_data["email"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                password_hash=hash_password("password"),
                role=user_data["role"],
                is_active=True,
                email_verified=True,
                org_id=DEFAULT_ORG_ID,
            )
            db.add(new_user)
            logger.info(f"Created demo user: {user_data['email']}")
    
    db.commit()
