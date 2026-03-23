"""
Admin Governance Service — SentinelIQ

Business logic for the admin governance module:
- Policy management (CRUD + versioning)
- Enforcement actions (lock, freeze, override, MFA)
- IAM operations (create users, suspend, activate, role changes)
- Compliance reporting (system reports, org risk, audit export)
- System overview aggregation

All operations are audited via AuditLog entries.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
import uuid
import secrets
import string

from app.models import (
    User, AuditLog, Organization, Loan, RefreshToken,
    LoginAttempt, SecurityAlert, UserSession
)
from app.models.admin import Policy, EnforcementAction
from app.models.analyst import Investigation, Recommendation
from app.core.security import hash_password
from app.core.auth_utils import revoke_all_user_tokens
from app.core.logging import logger


class AdminGovernanceService:
    """
    Core governance service providing policy management, enforcement,
    IAM operations, and compliance reporting for admin users.
    """

    # ═══════════════════════════════════════════════════════════
    # System Overview
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def get_system_overview(db: Session) -> Dict[str, Any]:
        """
        Get comprehensive system overview for admin dashboard landing.
        Aggregates risk distribution, pending actions, and key metrics.
        """
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)

        # Risk distribution
        total_users = db.query(func.count(User.id)).filter(
            User.is_system_user == False
        ).scalar() or 0

        low_risk = db.query(func.count(User.id)).filter(
            User.risk_score < 300, User.is_system_user == False
        ).scalar() or 0
        medium_risk = db.query(func.count(User.id)).filter(
            User.risk_score.between(300, 599), User.is_system_user == False
        ).scalar() or 0
        high_risk = db.query(func.count(User.id)).filter(
            User.risk_score.between(600, 799), User.is_system_user == False
        ).scalar() or 0
        critical_risk = db.query(func.count(User.id)).filter(
            User.risk_score >= 800, User.is_system_user == False
        ).scalar() or 0

        # Active investigations
        active_investigations = db.query(func.count(Investigation.id)).filter(
            Investigation.status.in_(["open", "monitoring", "escalated"])
        ).scalar() or 0

        # Pending recommendations
        pending_recommendations = db.query(func.count(Recommendation.id)).filter(
            Recommendation.status == "pending"
        ).scalar() or 0

        # Recent enforcement actions (last 7 days)
        recent_enforcements = db.query(func.count(EnforcementAction.id)).filter(
            EnforcementAction.created_at >= week_ago
        ).scalar() or 0

        # Active sessions
        active_sessions = db.query(func.count(RefreshToken.id)).filter(
            and_(
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > now
            )
        ).scalar() or 0

        # Policy count
        policy_count = db.query(func.count(Policy.id)).filter(
            Policy.active == True
        ).scalar() or 0

        # MFA adoption
        mfa_users = db.query(func.count(User.id)).filter(
            User.mfa_enabled == True, User.is_system_user == False
        ).scalar() or 0
        mfa_percent = round((mfa_users / total_users) * 100, 1) if total_users > 0 else 0.0

        # Suspicious orgs (orgs with >30% high-risk users)
        suspicious_org_count = 0
        try:
            orgs = db.query(Organization).all()
            for org in orgs:
                org_users = db.query(func.count(User.id)).filter(
                    User.org_id == org.id
                ).scalar() or 0
                if org_users > 0:
                    org_high = db.query(func.count(User.id)).filter(
                        User.org_id == org.id, User.risk_score >= 600
                    ).scalar() or 0
                    if (org_high / org_users) > 0.3:
                        suspicious_org_count += 1
        except Exception:
            pass

        return {
            "risk_distribution": {
                "low": low_risk,
                "medium": medium_risk,
                "high": high_risk,
                "critical": critical_risk
            },
            "active_investigations": active_investigations,
            "pending_recommendations": pending_recommendations,
            "recent_enforcement_actions": recent_enforcements,
            "total_users": total_users,
            "active_sessions": active_sessions,
            "high_risk_user_count": high_risk + critical_risk,
            "policy_count": policy_count,
            "mfa_adoption_percent": mfa_percent,
            "suspicious_org_count": suspicious_org_count
        }

    # ═══════════════════════════════════════════════════════════
    # Policy Management
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def list_policies(
        db: Session,
        category: Optional[str] = None,
        active_only: bool = True,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """List governance policies with filtering and pagination."""
        query = db.query(Policy)
        if category:
            query = query.filter(Policy.category == category)
        if active_only:
            query = query.filter(Policy.active == True)

        total = query.count()
        policies = query.order_by(desc(Policy.updated_at)).offset(
            (page - 1) * page_size
        ).limit(page_size).all()

        return {
            "policies": [
                {
                    "id": p.id,
                    "name": p.name,
                    "category": p.category,
                    "description": p.description,
                    "config": p.config,
                    "version": p.version,
                    "active": p.active,
                    "created_by": p.created_by,
                    "updated_by": p.updated_by,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                    "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                }
                for p in policies
            ],
            "total": total,
            "page": page,
            "page_size": page_size
        }

    @staticmethod
    def get_policy(db: Session, policy_id: str) -> Optional[Dict[str, Any]]:
        """Get a single policy by ID."""
        p = db.query(Policy).filter(Policy.id == policy_id).first()
        if not p:
            return None
        return {
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "description": p.description,
            "config": p.config,
            "version": p.version,
            "active": p.active,
            "created_by": p.created_by,
            "updated_by": p.updated_by,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }

    @staticmethod
    def create_policy(
        db: Session, data: Dict[str, Any], admin_id: str
    ) -> Dict[str, Any]:
        """Create a new governance policy."""
        # Check for duplicate name
        existing = db.query(Policy).filter(Policy.name == data["name"]).first()
        if existing:
            return {"error": f"Policy with name '{data['name']}' already exists"}

        policy = Policy(
            id=str(uuid.uuid4()),
            name=data["name"],
            category=data.get("category", "general"),
            description=data.get("description"),
            config=data["config"],
            version=1,
            active=True,
            created_by=admin_id,
            updated_by=admin_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(policy)

        # Audit log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="policy_created",
            target=policy.id,
            event_metadata={"policy_name": data["name"], "category": data.get("category", "general")},
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()
        db.refresh(policy)

        logger.info(f"Policy created: {policy.name} by admin {admin_id}")
        return {
            "id": policy.id,
            "name": policy.name,
            "category": policy.category,
            "description": policy.description,
            "config": policy.config,
            "version": policy.version,
            "active": policy.active,
            "created_by": policy.created_by,
            "updated_by": policy.updated_by,
            "created_at": policy.created_at.isoformat(),
            "updated_at": policy.updated_at.isoformat(),
        }

    @staticmethod
    def update_policy(
        db: Session, policy_id: str, data: Dict[str, Any], admin_id: str
    ) -> Optional[Dict[str, Any]]:
        """Update an existing policy (increments version)."""
        policy = db.query(Policy).filter(Policy.id == policy_id).first()
        if not policy:
            return None

        old_config = policy.config.copy() if policy.config else {}

        if "name" in data and data["name"] is not None:
            policy.name = data["name"]
        if "category" in data and data["category"] is not None:
            policy.category = data["category"]
        if "description" in data and data["description"] is not None:
            policy.description = data["description"]
        if "config" in data and data["config"] is not None:
            policy.config = data["config"]
        if "active" in data and data["active"] is not None:
            policy.active = data["active"]

        policy.version += 1
        policy.updated_by = admin_id
        policy.updated_at = datetime.utcnow()

        # Audit log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="policy_updated",
            target=policy_id,
            event_metadata={
                "policy_name": policy.name,
                "version": policy.version,
                "changes": data,
                "previous_config": old_config,
            },
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()
        db.refresh(policy)

        logger.info(f"Policy updated: {policy.name} v{policy.version} by admin {admin_id}")
        return {
            "id": policy.id,
            "name": policy.name,
            "category": policy.category,
            "description": policy.description,
            "config": policy.config,
            "version": policy.version,
            "active": policy.active,
            "created_by": policy.created_by,
            "updated_by": policy.updated_by,
            "created_at": policy.created_at.isoformat() if policy.created_at else None,
            "updated_at": policy.updated_at.isoformat() if policy.updated_at else None,
        }

    @staticmethod
    def delete_policy(db: Session, policy_id: str, admin_id: str) -> Optional[Dict[str, Any]]:
        """Soft-delete a policy (set active=False). Policies are never hard-deleted."""
        policy = db.query(Policy).filter(Policy.id == policy_id).first()
        if not policy:
            return None

        policy.active = False
        policy.updated_by = admin_id
        policy.updated_at = datetime.utcnow()

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="policy_deactivated",
            target=policy_id,
            event_metadata={"policy_name": policy.name},
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        logger.info(f"Policy deactivated: {policy.name} by admin {admin_id}")
        return {"msg": f"Policy '{policy.name}' deactivated", "id": policy_id}

    # ═══════════════════════════════════════════════════════════
    # Enforcement Actions
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def lock_user(db: Session, user_id: str, admin_id: str, reason: str) -> Dict[str, Any]:
        """Lock a user account immediately. Revokes all tokens."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}
        if user.id == admin_id:
            return {"error": "Cannot lock your own account"}

        user.is_active = False
        user.status = "suspended"
        user.updated_at = datetime.utcnow()

        # Revoke all tokens
        revoke_all_user_tokens(user_id, db)

        # Record enforcement
        action_record = EnforcementAction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action="lock",
            enforced_by=admin_id,
            reason=reason,
            action_metadata={"previous_status": user.status},
            created_at=datetime.utcnow(),
        )
        db.add(action_record)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="user_locked",
            target=user_id,
            event_metadata={"reason": reason, "user_email": user.email},
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        logger.info(f"User locked: {user.email} by admin {admin_id}")
        return {"msg": f"User {user.email} locked", "user_id": user_id}

    @staticmethod
    def unlock_user(db: Session, user_id: str, admin_id: str, reason: str) -> Dict[str, Any]:
        """Unlock a previously locked/suspended user account."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}

        user.is_active = True
        user.status = "active"
        user.updated_at = datetime.utcnow()

        action_record = EnforcementAction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action="unlock",
            enforced_by=admin_id,
            reason=reason,
            created_at=datetime.utcnow(),
        )
        db.add(action_record)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="user_unlocked",
            target=user_id,
            event_metadata={"reason": reason, "user_email": user.email},
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        logger.info(f"User unlocked: {user.email} by admin {admin_id}")
        return {"msg": f"User {user.email} unlocked", "user_id": user_id}

    @staticmethod
    def freeze_loan(db: Session, user_id: str, admin_id: str, reason: str) -> Dict[str, Any]:
        """Freeze all active loans for a user."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}

        loans = db.query(Loan).filter(
            Loan.user_id == user_id,
            Loan.status.in_(["active", "approved", "pending"])
        ).all()

        frozen_count = 0
        for loan in loans:
            loan.status = "frozen"
            loan.updated_at = datetime.utcnow()
            frozen_count += 1

        action_record = EnforcementAction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action="freeze_loan",
            enforced_by=admin_id,
            reason=reason,
            action_metadata={"loans_frozen": frozen_count},
            created_at=datetime.utcnow(),
        )
        db.add(action_record)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="loans_frozen",
            target=user_id,
            event_metadata={"reason": reason, "loans_frozen": frozen_count},
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        logger.info(f"Loans frozen for {user.email}: {frozen_count} loans by admin {admin_id}")
        return {"msg": f"Frozen {frozen_count} loans for {user.email}", "loans_frozen": frozen_count}

    @staticmethod
    def override_risk_score(
        db: Session, user_id: str, admin_id: str, new_score: int, reason: str
    ) -> Dict[str, Any]:
        """Override a user's risk score manually."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}

        old_score = user.risk_score
        user.risk_score = new_score
        user.updated_at = datetime.utcnow()

        # Update trust level based on new score
        if new_score < 300:
            user.trust_level = "trusted"
        elif new_score < 600:
            user.trust_level = "under_review"
        else:
            user.trust_level = "restricted"

        action_record = EnforcementAction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action="override_risk",
            enforced_by=admin_id,
            reason=reason,
            action_metadata={"old_score": old_score, "new_score": new_score},
            created_at=datetime.utcnow(),
        )
        db.add(action_record)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="risk_score_overridden",
            target=user_id,
            event_metadata={
                "reason": reason,
                "old_score": old_score,
                "new_score": new_score
            },
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        logger.info(f"Risk override: {user.email} {old_score} → {new_score} by admin {admin_id}")
        return {
            "msg": f"Risk score updated for {user.email}",
            "old_score": old_score,
            "new_score": new_score
        }

    @staticmethod
    def force_mfa(db: Session, user_id: str, admin_id: str) -> Dict[str, Any]:
        """Force MFA enrollment for a user."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}

        if user.mfa_enabled:
            return {"msg": "User already has MFA enabled", "user_id": user_id}

        # Mark MFA as required (but not yet enrolled)
        # The user will need to complete MFA setup on next login
        user.user_metadata = user.user_metadata or {}
        user.user_metadata["mfa_required"] = True
        user.user_metadata["mfa_required_by"] = admin_id
        user.user_metadata["mfa_required_at"] = datetime.utcnow().isoformat()
        user.updated_at = datetime.utcnow()

        # Force flag update for JSON column
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(user, "user_metadata")

        action_record = EnforcementAction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action="require_mfa",
            enforced_by=admin_id,
            reason="Admin enforced MFA requirement",
            created_at=datetime.utcnow(),
        )
        db.add(action_record)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="mfa_enforced",
            target=user_id,
            event_metadata={"user_email": user.email},
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        logger.info(f"MFA enforced for {user.email} by admin {admin_id}")
        return {"msg": f"MFA requirement set for {user.email}", "user_id": user_id}

    @staticmethod
    def force_password_reset(db: Session, user_id: str, admin_id: str) -> Dict[str, Any]:
        """Force a password reset for a user. Revokes all tokens."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}

        # Set password reset flag
        user.user_metadata = user.user_metadata or {}
        user.user_metadata["password_reset_required"] = True
        user.user_metadata["password_reset_required_by"] = admin_id
        user.user_metadata["password_reset_required_at"] = datetime.utcnow().isoformat()
        user.updated_at = datetime.utcnow()

        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(user, "user_metadata")

        # Revoke all tokens to force re-auth
        revoke_all_user_tokens(user_id, db)

        action_record = EnforcementAction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action="force_password_reset",
            enforced_by=admin_id,
            reason="Admin forced password reset",
            created_at=datetime.utcnow(),
        )
        db.add(action_record)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="password_reset_forced",
            target=user_id,
            event_metadata={"user_email": user.email},
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        logger.info(f"Password reset forced for {user.email} by admin {admin_id}")
        return {"msg": f"Password reset required for {user.email}", "user_id": user_id}

    @staticmethod
    def suspend_user(db: Session, user_id: str, admin_id: str, reason: str) -> Dict[str, Any]:
        """Suspend a user account (soft disable)."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}
        if user.id == admin_id:
            return {"error": "Cannot suspend your own account"}

        user.status = "suspended"
        user.is_active = False
        user.updated_at = datetime.utcnow()

        revoke_all_user_tokens(user_id, db)

        action_record = EnforcementAction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action="suspend",
            enforced_by=admin_id,
            reason=reason,
            created_at=datetime.utcnow(),
        )
        db.add(action_record)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="user_suspended",
            target=user_id,
            event_metadata={"reason": reason, "user_email": user.email},
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        logger.info(f"User suspended: {user.email} by admin {admin_id}")
        return {"msg": f"User {user.email} suspended", "user_id": user_id}

    @staticmethod
    def activate_user(db: Session, user_id: str, admin_id: str, reason: str) -> Dict[str, Any]:
        """Re-activate a suspended user account."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}

        user.status = "active"
        user.is_active = True
        user.updated_at = datetime.utcnow()

        action_record = EnforcementAction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action="activate",
            enforced_by=admin_id,
            reason=reason,
            created_at=datetime.utcnow(),
        )
        db.add(action_record)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="user_activated",
            target=user_id,
            event_metadata={"reason": reason, "user_email": user.email},
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        logger.info(f"User activated: {user.email} by admin {admin_id}")
        return {"msg": f"User {user.email} activated", "user_id": user_id}

    # ═══════════════════════════════════════════════════════════
    # Recommendation Review
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def list_pending_recommendations(db: Session, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """List all pending analyst recommendations for admin review."""
        query = db.query(Recommendation).filter(Recommendation.status == "pending")
        total = query.count()
        recs = query.order_by(desc(Recommendation.created_at)).offset(
            (page - 1) * page_size
        ).limit(page_size).all()

        results = []
        for r in recs:
            investigation = db.query(Investigation).filter(
                Investigation.id == r.investigation_id
            ).first()
            analyst = db.query(User).filter(User.id == r.recommended_by).first()
            subject = db.query(User).filter(
                User.id == investigation.user_id
            ).first() if investigation else None

            results.append({
                "id": r.id,
                "investigation_id": r.investigation_id,
                "recommended_by": r.recommended_by,
                "analyst_name": f"{analyst.first_name} {analyst.last_name}" if analyst else "Unknown",
                "action": r.action,
                "justification": r.justification,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "subject_user_id": investigation.user_id if investigation else None,
                "subject_name": f"{subject.first_name} {subject.last_name}" if subject else "Unknown",
                "subject_email": subject.email if subject else None,
                "subject_risk_score": subject.risk_score if subject else 0,
                "investigation_severity": investigation.severity if investigation else "unknown",
            })

        return {"recommendations": results, "total": total, "page": page, "page_size": page_size}

    @staticmethod
    def approve_recommendation(
        db: Session, rec_id: str, admin_id: str, review_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Approve an analyst recommendation and execute the enforcement action."""
        rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
        if not rec:
            return {"error": "Recommendation not found"}
        if rec.status != "pending":
            return {"error": f"Recommendation already {rec.status}"}

        rec.status = "approved"
        rec.reviewed_by = admin_id
        rec.reviewed_at = datetime.utcnow()
        rec.review_notes = review_notes

        # Execute the recommended action
        investigation = db.query(Investigation).filter(
            Investigation.id == rec.investigation_id
        ).first()
        target_user_id = investigation.user_id if investigation else None

        execution_result = None
        if target_user_id:
            action_map = {
                "lock": lambda: AdminGovernanceService.lock_user(
                    db, target_user_id, admin_id,
                    f"Approved recommendation: {rec.justification}"
                ),
                "restrict": lambda: AdminGovernanceService.suspend_user(
                    db, target_user_id, admin_id,
                    f"Restriction approved: {rec.justification}"
                ),
                "freeze_loan": lambda: AdminGovernanceService.freeze_loan(
                    db, target_user_id, admin_id,
                    f"Loan freeze approved: {rec.justification}"
                ),
                "step_up_auth": lambda: AdminGovernanceService.force_mfa(
                    db, target_user_id, admin_id
                ),
            }
            executor = action_map.get(rec.action)
            if executor:
                execution_result = executor()

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="recommendation_approved",
            target=rec_id,
            event_metadata={
                "recommendation_action": rec.action,
                "target_user_id": target_user_id,
                "review_notes": review_notes,
                "execution_result": str(execution_result) if execution_result else None,
            },
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        return {
            "msg": f"Recommendation approved and executed",
            "recommendation_id": rec_id,
            "action": rec.action,
            "execution_result": execution_result,
        }

    @staticmethod
    def reject_recommendation(
        db: Session, rec_id: str, admin_id: str, review_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Reject an analyst recommendation."""
        rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
        if not rec:
            return {"error": "Recommendation not found"}
        if rec.status != "pending":
            return {"error": f"Recommendation already {rec.status}"}

        rec.status = "rejected"
        rec.reviewed_by = admin_id
        rec.reviewed_at = datetime.utcnow()
        rec.review_notes = review_notes

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="recommendation_rejected",
            target=rec_id,
            event_metadata={
                "recommendation_action": rec.action,
                "review_notes": review_notes,
            },
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        return {"msg": "Recommendation rejected", "recommendation_id": rec_id}

    # ═══════════════════════════════════════════════════════════
    # IAM Operations
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def list_users(
        db: Session,
        role: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """List users with filtering for IAM management."""
        query = db.query(User).filter(User.is_system_user == False)

        if role:
            query = query.filter(User.role == role)
        if status:
            query = query.filter(User.status == status)
        if search:
            query = query.filter(
                (User.email.ilike(f"%{search}%")) |
                (User.first_name.ilike(f"%{search}%")) |
                (User.last_name.ilike(f"%{search}%"))
            )

        total = query.count()
        users = query.order_by(desc(User.created_at)).offset(
            (page - 1) * page_size
        ).limit(page_size).all()

        result = []
        for u in users:
            enforcement_count = db.query(func.count(EnforcementAction.id)).filter(
                EnforcementAction.user_id == u.id
            ).scalar() or 0

            result.append({
                "id": u.id,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "role": u.role,
                "status": u.status or "active",
                "visibility": u.visibility or "private",
                "is_active": u.is_active,
                "email_verified": u.email_verified,
                "mfa_enabled": u.mfa_enabled,
                "risk_score": u.risk_score,
                "trust_level": u.trust_level or "unknown",
                "org_id": u.org_id,
                "is_system_user": u.is_system_user,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "last_login_ip": u.last_login_ip,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "updated_at": u.updated_at.isoformat() if u.updated_at else None,
                "enforcement_count": enforcement_count,
            })

        return {"users": result, "total": total, "page": page, "page_size": page_size}

    @staticmethod
    def create_user(db: Session, data: Dict[str, Any], admin_id: str) -> Dict[str, Any]:
        """Create a new user (admin-initiated)."""
        # Check for existing email
        existing = db.query(User).filter(User.email == data["email"]).first()
        if existing:
            return {"error": f"User with email '{data['email']}' already exists"}

        # Generate temporary password if not provided
        password = data.get("password")
        if not password:
            password = ''.join(secrets.choice(
                string.ascii_letters + string.digits + "!@#$%"
            ) for _ in range(16))

        org_id = data.get("org_id") or None
        if org_id:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                org = Organization(id=org_id, name=f"Auto-created Org {org_id}")
                db.add(org)
                logger.info(f"Auto-created organization with id={org_id} for user creation")
                db.flush()  # Ensure org is persisted before user FK

        user = User(
            id=str(uuid.uuid4()),
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            role=data.get("role", "viewer"),
            org_id=org_id,
            phone=data.get("phone") or None,
            risk_score=data.get("risk_score", 0),
            password_hash=hash_password(password),
            status=data.get("status", "active"),
            is_active=data.get("status", "active") == "active",
            email_verified=True,  # Admin-created users are trusted — no email verification needed
            created_by=admin_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="user_created_by_admin",
            target=user.id,
            event_metadata={"email": data["email"], "role": data.get("role", "viewer")},
            timestamp=datetime.utcnow(),
        )
        try:
            db.add(user)
            db.add(audit)
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            logger.error(f"User creation failed: {e}")
            return {"error": "User creation failed due to a database error."}

        logger.info(f"User created by admin: {user.email} (role={user.role})")
        return {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "org_id": user.org_id,
            "phone": user.phone,
            "risk_score": user.risk_score,
            "status": user.status,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "temporary_password": password,
            "msg": "User created successfully"
        }

    @staticmethod
    def update_user(db: Session, user_id: str, data: Dict[str, Any], admin_id: str) -> Dict[str, Any]:
        """Update user details (admin-initiated)."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}

        changes = {}
        for field in ["first_name", "last_name", "role", "org_id", "status", "visibility", "trust_level"]:
            if field in data and data[field] is not None:
                old_val = getattr(user, field)
                setattr(user, field, data[field])
                changes[field] = {"old": old_val, "new": data[field]}

        if "status" in data:
            user.is_active = data["status"] == "active"

        user.updated_at = datetime.utcnow()

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_id,
            action="user_updated_by_admin",
            target=user_id,
            event_metadata={"changes": changes, "user_email": user.email},
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()

        logger.info(f"User updated by admin: {user.email}, changes={list(changes.keys())}")
        return {"msg": f"User {user.email} updated", "changes": changes}

    # ═══════════════════════════════════════════════════════════
    # Enforcement History
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def get_enforcement_history(
        db: Session,
        user_id: Optional[str] = None,
        action_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Get enforcement action history with filtering."""
        query = db.query(EnforcementAction)

        if user_id:
            query = query.filter(EnforcementAction.user_id == user_id)
        if action_type:
            query = query.filter(EnforcementAction.action == action_type)

        total = query.count()
        actions = query.order_by(desc(EnforcementAction.created_at)).offset(
            (page - 1) * page_size
        ).limit(page_size).all()

        results = []
        for a in actions:
            target = db.query(User).filter(User.id == a.user_id).first()
            admin = db.query(User).filter(User.id == a.enforced_by).first()

            results.append({
                "id": a.id,
                "user_id": a.user_id,
                "action": a.action,
                "enforced_by": a.enforced_by,
                "reason": a.reason,
                "metadata": a.action_metadata or {},
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "target_user_name": f"{target.first_name} {target.last_name}" if target else "Unknown",
                "target_user_email": target.email if target else None,
                "admin_name": f"{admin.first_name} {admin.last_name}" if admin else "Unknown",
            })

        return {"actions": results, "total": total, "page": page, "page_size": page_size}

    # ═══════════════════════════════════════════════════════════
    # Compliance & Reporting
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def get_system_report(db: Session) -> Dict[str, Any]:
        """Generate comprehensive system compliance report."""
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)

        # User summary
        total_users = db.query(func.count(User.id)).filter(
            User.is_system_user == False
        ).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(
            User.is_active == True, User.is_system_user == False
        ).scalar() or 0
        suspended_users = db.query(func.count(User.id)).filter(
            User.status == "suspended"
        ).scalar() or 0
        mfa_enabled = db.query(func.count(User.id)).filter(
            User.mfa_enabled == True, User.is_system_user == False
        ).scalar() or 0
        verified_users = db.query(func.count(User.id)).filter(
            User.email_verified == True, User.is_system_user == False
        ).scalar() or 0

        # Risk summary
        avg_risk = db.query(func.avg(User.risk_score)).filter(
            User.is_system_user == False
        ).scalar() or 0
        high_risk = db.query(func.count(User.id)).filter(
            User.risk_score >= 600, User.is_system_user == False
        ).scalar() or 0

        # Enforcement summary (last 30 days)
        enforcement_count = db.query(func.count(EnforcementAction.id)).filter(
            EnforcementAction.created_at >= thirty_days_ago
        ).scalar() or 0

        enforcement_by_type = db.query(
            EnforcementAction.action, func.count(EnforcementAction.id)
        ).filter(
            EnforcementAction.created_at >= thirty_days_ago
        ).group_by(EnforcementAction.action).all()

        # Policy summary
        active_policies = db.query(func.count(Policy.id)).filter(
            Policy.active == True
        ).scalar() or 0
        total_policies = db.query(func.count(Policy.id)).scalar() or 0

        # Compliance indicators
        login_failures_30d = db.query(func.count(LoginAttempt.id)).filter(
            LoginAttempt.success == False,
            LoginAttempt.timestamp >= thirty_days_ago
        ).scalar() or 0

        audit_entries_30d = db.query(func.count(AuditLog.id)).filter(
            AuditLog.timestamp >= thirty_days_ago
        ).scalar() or 0

        return {
            "generated_at": now.isoformat(),
            "report_period": {
                "start": thirty_days_ago.isoformat(),
                "end": now.isoformat()
            },
            "user_summary": {
                "total": total_users,
                "active": active_users,
                "suspended": suspended_users,
                "mfa_enabled": mfa_enabled,
                "mfa_adoption_rate": round((mfa_enabled / total_users) * 100, 1) if total_users > 0 else 0,
                "email_verified": verified_users,
                "verification_rate": round((verified_users / total_users) * 100, 1) if total_users > 0 else 0,
            },
            "risk_summary": {
                "average_risk_score": round(float(avg_risk), 1),
                "high_risk_users": high_risk,
                "high_risk_rate": round((high_risk / total_users) * 100, 1) if total_users > 0 else 0,
            },
            "enforcement_summary": {
                "total_actions_30d": enforcement_count,
                "by_type": {action: count for action, count in enforcement_by_type},
            },
            "policy_summary": {
                "active_policies": active_policies,
                "total_policies": total_policies,
            },
            "compliance_indicators": {
                "failed_logins_30d": login_failures_30d,
                "audit_entries_30d": audit_entries_30d,
                "mfa_adoption_rate": round((mfa_enabled / total_users) * 100, 1) if total_users > 0 else 0,
                "account_lockout_rate": round((suspended_users / total_users) * 100, 1) if total_users > 0 else 0,
            }
        }

    @staticmethod
    def get_org_risk_summary(db: Session) -> List[Dict[str, Any]]:
        """Get risk summary per organization."""
        orgs = db.query(Organization).all()
        results = []

        for org in orgs:
            total = db.query(func.count(User.id)).filter(User.org_id == org.id).scalar() or 0
            if total == 0:
                continue

            high_risk = db.query(func.count(User.id)).filter(
                User.org_id == org.id, User.risk_score >= 600
            ).scalar() or 0

            avg_risk = db.query(func.avg(User.risk_score)).filter(
                User.org_id == org.id
            ).scalar() or 0

            active_inv = db.query(func.count(Investigation.id)).filter(
                Investigation.status.in_(["open", "monitoring", "escalated"])
            ).join(User, User.id == Investigation.user_id).filter(
                User.org_id == org.id
            ).scalar() or 0

            pending_recs = db.query(func.count(Recommendation.id)).filter(
                Recommendation.status == "pending"
            ).join(Investigation, Investigation.id == Recommendation.investigation_id).join(
                User, User.id == Investigation.user_id
            ).filter(User.org_id == org.id).scalar() or 0

            recent_enforcements = db.query(func.count(EnforcementAction.id)).filter(
                EnforcementAction.created_at >= datetime.utcnow() - timedelta(days=30)
            ).join(User, User.id == EnforcementAction.user_id).filter(
                User.org_id == org.id
            ).scalar() or 0

            results.append({
                "org_id": org.id,
                "org_name": org.name,
                "total_users": total,
                "high_risk_users": high_risk,
                "avg_risk_score": round(float(avg_risk), 1),
                "active_investigations": active_inv,
                "pending_recommendations": pending_recs,
                "recent_enforcement_count": recent_enforcements,
            })

        return sorted(results, key=lambda x: x["avg_risk_score"], reverse=True)

    @staticmethod
    def get_audit_logs(
        db: Session,
        actor_id: Optional[str] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """Get full audit trail with filtering."""
        query = db.query(AuditLog)

        if actor_id:
            query = query.filter(AuditLog.actor_id == actor_id)
        if action:
            query = query.filter(AuditLog.action == action)
        if start_date:
            query = query.filter(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.filter(AuditLog.timestamp <= end_date)

        total = query.count()
        logs = query.order_by(desc(AuditLog.timestamp)).offset(
            (page - 1) * page_size
        ).limit(page_size).all()

        results = []
        for log in logs:
            actor = db.query(User).filter(User.id == log.actor_id).first() if log.actor_id else None
            results.append({
                "id": log.id,
                "actor_id": log.actor_id,
                "actor_name": f"{actor.first_name} {actor.last_name}" if actor else "System",
                "actor_email": actor.email if actor else None,
                "action": log.action,
                "target": log.target,
                "metadata": log.event_metadata or {},
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            })

        return {"logs": results, "total": total, "page": page, "page_size": page_size}

    @staticmethod
    def export_audit_logs(
        db: Session,
        format: str = "json",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        actions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Export audit logs for regulatory compliance."""
        query = db.query(AuditLog)

        if start_date:
            query = query.filter(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.filter(AuditLog.timestamp <= end_date)
        if actions:
            query = query.filter(AuditLog.action.in_(actions))

        logs = query.order_by(desc(AuditLog.timestamp)).limit(10000).all()

        records = []
        for log in logs:
            records.append({
                "id": log.id,
                "actor_id": log.actor_id,
                "action": log.action,
                "target": log.target,
                "metadata": log.event_metadata or {},
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            })

        return {
            "format": format,
            "record_count": len(records),
            "exported_at": datetime.utcnow().isoformat(),
            "records": records
        }
