"""
Analyst Service Layer — SentinelIQ

Core business logic for the analyst investigation module:
- Alert feed aggregation
- Investigation lifecycle management
- User inspection & risk correlation
- Recommendation workflow
- Searching across users, orgs, cases
- Risk insights aggregation

All analyst actions are audit-logged for compliance.
"""

import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any

from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_, case

from app.models import (
    User, AuditLog, LoginAttempt, Organization,
    SecurityAlert, UserSession, Loan, LoanRepayment
)
from app.models.analyst import Investigation, InvestigationNote, Recommendation
from app.models.events import RiskDecision, DeviceFingerprint

logger = logging.getLogger("sentineliq.analyst")


class AnalystService:
    """
    Service layer for analyst investigation workflows.
    Enforces separation of duties — analysts recommend, admins enforce.
    """

    # ═══════════════════════════════════════════════════════════
    # Alert Feed
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def get_alert_feed(
        db: Session,
        severity: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Aggregated alert feed for analysts.
        Combines: high-risk users, suspicious activity, loan anomalies,
        compliance alerts, device anomalies.
        """
        alerts: List[Dict[str, Any]] = []

        # 1. High-risk users (risk_score > 60)
        high_risk = db.query(User).filter(
            User.risk_score > 60,
            User.is_active == True,
            User.is_system_user == False,
        ).order_by(desc(User.risk_score)).limit(20).all()

        for u in high_risk:
            sev = "critical" if u.risk_score > 80 else "high"
            if severity and sev != severity:
                continue
            alerts.append({
                "id": f"risk-{u.id}",
                "alert_type": "high_risk_user",
                "severity": sev,
                "title": f"High Risk User: {u.first_name} {u.last_name}",
                "message": f"Risk score {u.risk_score}/100. Trust level: {u.trust_level}.",
                "user_id": u.id,
                "user_email": u.email,
                "risk_score": u.risk_score,
                "metadata": {
                    "trust_level": u.trust_level,
                    "risk_breakdown": u.risk_breakdown,
                    "role": u.role,
                    "org_id": u.org_id,
                },
                "timestamp": (u.updated_at or u.created_at).isoformat(),
            })

        # 2. Failed login spikes
        cutoff_1h = datetime.utcnow() - timedelta(hours=1)
        failed_logins = db.query(
            LoginAttempt.email,
            func.count(LoginAttempt.id).label("cnt"),
        ).filter(
            LoginAttempt.timestamp >= cutoff_1h,
            LoginAttempt.success == False,
        ).group_by(LoginAttempt.email).having(
            func.count(LoginAttempt.id) >= 3
        ).all()

        for email, cnt in failed_logins:
            u = db.query(User).filter(User.email == email).first()
            sev = "critical" if cnt >= 10 else "high" if cnt >= 5 else "medium"
            if severity and sev != severity:
                continue
            alerts.append({
                "id": f"login-{email}-{cnt}",
                "alert_type": "suspicious_login",
                "severity": sev,
                "title": f"Suspicious Login Activity: {email}",
                "message": f"{cnt} failed login attempts in the last hour.",
                "user_id": u.id if u else None,
                "user_email": email,
                "risk_score": u.risk_score if u else None,
                "metadata": {"failed_count": cnt, "window": "1h"},
                "timestamp": datetime.utcnow().isoformat(),
            })

        # 3. Overdue loans
        try:
            overdue_loans = db.query(Loan).filter(
                Loan.status == "active",
                Loan.next_due_date != None,
                Loan.next_due_date < datetime.utcnow().date(),
            ).all()

            for loan in overdue_loans:
                u = db.query(User).filter(User.id == loan.user_id).first()
                days_overdue = (datetime.utcnow().date() - loan.next_due_date).days
                sev = "critical" if days_overdue > 30 else "high" if days_overdue > 7 else "medium"
                if severity and sev != severity:
                    continue
                alerts.append({
                    "id": f"loan-{loan.id}",
                    "alert_type": "loan_overdue",
                    "severity": sev,
                    "title": f"Overdue Loan: {loan.id[:8]}...",
                    "message": f"Loan overdue by {days_overdue} days. Outstanding: ${float(loan.outstanding):,.2f}.",
                    "user_id": loan.user_id,
                    "user_email": u.email if u else None,
                    "risk_score": u.risk_score if u else None,
                    "metadata": {
                        "loan_id": loan.id,
                        "days_overdue": days_overdue,
                        "outstanding": float(loan.outstanding),
                        "principal": float(loan.principal),
                    },
                    "timestamp": datetime.utcnow().isoformat(),
                })
        except Exception:
            pass

        # 4. Unread security alerts
        try:
            sec_alerts = db.query(SecurityAlert).filter(
                SecurityAlert.is_dismissed == False,
                SecurityAlert.severity.in_(["warning", "critical"]),
            ).order_by(desc(SecurityAlert.created_at)).limit(20).all()

            for sa in sec_alerts:
                if severity and sa.severity != severity:
                    continue
                u = db.query(User).filter(User.id == sa.user_id).first()
                alerts.append({
                    "id": f"sec-{sa.id}",
                    "alert_type": sa.alert_type,
                    "severity": sa.severity,
                    "title": sa.title,
                    "message": sa.message,
                    "user_id": sa.user_id,
                    "user_email": u.email if u else None,
                    "risk_score": u.risk_score if u else None,
                    "metadata": sa.alert_metadata or {},
                    "timestamp": (sa.created_at or datetime.utcnow()).isoformat(),
                })
        except Exception:
            pass

        # 5. Forbidden access attempts
        cutoff_24h = datetime.utcnow() - timedelta(hours=24)
        forbidden = db.query(
            AuditLog.actor_id,
            func.count(AuditLog.id).label("cnt"),
        ).filter(
            AuditLog.timestamp >= cutoff_24h,
            AuditLog.action.contains("forbidden"),
        ).group_by(AuditLog.actor_id).having(
            func.count(AuditLog.id) >= 2
        ).all()

        for actor_id, cnt in forbidden:
            u = db.query(User).filter(User.id == actor_id).first()
            sev = "high" if cnt >= 5 else "medium"
            if severity and sev != severity:
                continue
            alerts.append({
                "id": f"forbid-{actor_id}",
                "alert_type": "forbidden_access",
                "severity": sev,
                "title": f"Forbidden Access Attempts: {u.email if u else actor_id[:8]}",
                "message": f"{cnt} forbidden access attempts in 24h.",
                "user_id": actor_id,
                "user_email": u.email if u else None,
                "risk_score": u.risk_score if u else None,
                "metadata": {"attempts": cnt, "window": "24h"},
                "timestamp": datetime.utcnow().isoformat(),
            })

        # Category filtering
        if category:
            alerts = [a for a in alerts if a["alert_type"] == category]

        # Sort by severity priority then timestamp
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        alerts.sort(key=lambda a: (severity_order.get(a["severity"], 5), a["timestamp"]), reverse=False)

        # Categorize
        categories: Dict[str, int] = {}
        for a in alerts:
            cat = a["alert_type"]
            categories[cat] = categories.get(cat, 0) + 1

        total = len(alerts)
        alerts = alerts[offset : offset + limit]

        return {
            "alerts": alerts,
            "total": total,
            "categories": categories,
        }

    # ═══════════════════════════════════════════════════════════
    # User Inspection
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def get_high_risk_users(
        db: Session,
        threshold: int = 50,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """List users with risk scores above threshold."""
        query = db.query(User).filter(
            User.risk_score >= threshold,
            User.is_system_user == False,
        )
        if org_id:
            query = query.filter(User.org_id == org_id)

        total = query.count()
        users = query.order_by(desc(User.risk_score)).offset(offset).limit(limit).all()

        return {
            "users": [
                {
                    "id": u.id,
                    "email": u.email,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "role": u.role,
                    "org_id": u.org_id,
                    "risk_score": u.risk_score,
                    "risk_breakdown": u.risk_breakdown,
                    "trust_level": u.trust_level,
                    "status": u.status,
                    "is_active": u.is_active,
                    "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                }
                for u in users
            ],
            "total": total,
            "threshold": threshold,
        }

    @staticmethod
    def inspect_user(db: Session, user_id: str) -> Dict[str, Any]:
        """Full user inspection for analyst review."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}

        # Risk context
        risk = {
            "risk_score": user.risk_score,
            "risk_breakdown": user.risk_breakdown or {},
            "trust_level": user.trust_level,
            "status": user.status,
        }

        # Activity timeline (last 30 days)
        cutoff = datetime.utcnow() - timedelta(days=30)
        audit_logs = db.query(AuditLog).filter(
            AuditLog.actor_id == user_id,
            AuditLog.timestamp >= cutoff,
        ).order_by(desc(AuditLog.timestamp)).limit(100).all()

        timeline = [
            {
                "id": log.id,
                "event_type": "audit",
                "action": log.action,
                "detail": log.target,
                "severity": "warning" if "forbidden" in (log.action or "") else "info",
                "metadata": log.event_metadata or {},
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            }
            for log in audit_logs
        ]

        # Login history
        logins = db.query(LoginAttempt).filter(
            LoginAttempt.email == user.email,
        ).order_by(desc(LoginAttempt.timestamp)).limit(50).all()

        login_history = [
            {
                "id": l.id,
                "success": l.success,
                "ip_address": l.ip_address,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            }
            for l in logins
        ]

        # Devices
        devices = []
        try:
            fps = db.query(DeviceFingerprint).filter(
                DeviceFingerprint.user_id == user_id
            ).order_by(desc(DeviceFingerprint.last_seen)).limit(20).all()
            devices = [
                {
                    "id": fp.id,
                    "user_agent": fp.user_agent,
                    "timezone": fp.timezone,
                    "is_trusted": fp.is_trusted,
                    "usage_count": fp.usage_count,
                    "first_seen": fp.first_seen.isoformat() if fp.first_seen else None,
                    "last_seen": fp.last_seen.isoformat() if fp.last_seen else None,
                }
                for fp in fps
            ]
        except Exception:
            pass

        # Loans
        loans = []
        try:
            user_loans = db.query(Loan).filter(Loan.user_id == user_id).order_by(desc(Loan.created_at)).all()
            loans = [
                {
                    "id": l.id,
                    "status": l.status,
                    "principal": float(l.principal),
                    "outstanding": float(l.outstanding),
                    "interest_rate": float(l.interest_rate),
                    "term_months": l.term_months,
                    "next_due_date": str(l.next_due_date) if l.next_due_date else None,
                    "created_at": l.created_at.isoformat() if l.created_at else None,
                }
                for l in user_loans
            ]
        except Exception:
            pass

        # Sessions
        sessions = []
        try:
            user_sessions = db.query(UserSession).filter(
                UserSession.user_id == user_id,
                UserSession.revoked == False,
            ).order_by(desc(UserSession.last_seen_at)).limit(10).all()
            sessions = [
                {
                    "id": s.id,
                    "ip_address": s.ip_address,
                    "device_info": s.device_info,
                    "location": s.location,
                    "is_current": s.is_current,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "last_seen_at": s.last_seen_at.isoformat() if s.last_seen_at else None,
                }
                for s in user_sessions
            ]
        except Exception:
            pass

        # Previous investigations
        investigations = []
        try:
            inv_list = db.query(Investigation).filter(
                Investigation.user_id == user_id
            ).order_by(desc(Investigation.created_at)).all()
            investigations = [
                {
                    "id": inv.id,
                    "status": inv.status,
                    "severity": inv.severity,
                    "reason": inv.reason,
                    "opened_by": inv.opened_by,
                    "created_at": inv.created_at.isoformat() if inv.created_at else None,
                }
                for inv in inv_list
            ]
        except Exception:
            pass

        # Alerts
        alerts = []
        try:
            user_alerts = db.query(SecurityAlert).filter(
                SecurityAlert.user_id == user_id,
            ).order_by(desc(SecurityAlert.created_at)).limit(20).all()
            alerts = [
                {
                    "id": a.id,
                    "alert_type": a.alert_type,
                    "severity": a.severity,
                    "title": a.title,
                    "message": a.message,
                    "is_read": a.is_read,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in user_alerts
            ]
        except Exception:
            pass

        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "status": user.status,
                "org_id": user.org_id,
                "mfa_enabled": user.mfa_enabled,
                "email_verified": user.email_verified,
                "phone": user.phone,
                "phone_verified": user.phone_verified,
                "is_active": user.is_active,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "last_login_ip": user.last_login_ip,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            },
            "risk": risk,
            "activity_timeline": timeline,
            "login_history": login_history,
            "devices": devices,
            "loans": loans,
            "sessions": sessions,
            "investigations": investigations,
            "alerts": alerts,
        }

    @staticmethod
    def get_user_timeline(
        db: Session, user_id: str, days: int = 30, limit: int = 100
    ) -> Dict[str, Any]:
        """Activity timeline for a specific user."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}

        cutoff = datetime.utcnow() - timedelta(days=days)
        logs = db.query(AuditLog).filter(
            AuditLog.actor_id == user_id,
            AuditLog.timestamp >= cutoff,
        ).order_by(desc(AuditLog.timestamp)).limit(limit).all()

        events = [
            {
                "id": log.id,
                "event_type": "audit",
                "action": log.action,
                "detail": log.target,
                "severity": "warning" if "forbidden" in (log.action or "") else "info",
                "metadata": log.event_metadata or {},
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            }
            for log in logs
        ]

        return {
            "user_id": user_id,
            "events": events,
            "total": len(events),
        }

    @staticmethod
    def get_user_devices(db: Session, user_id: str) -> List[Dict[str, Any]]:
        """Device history for a user."""
        try:
            fps = db.query(DeviceFingerprint).filter(
                DeviceFingerprint.user_id == user_id
            ).order_by(desc(DeviceFingerprint.last_seen)).all()
            return [
                {
                    "id": fp.id,
                    "user_agent": fp.user_agent,
                    "screen_resolution": fp.screen_resolution,
                    "timezone": fp.timezone,
                    "language": fp.language,
                    "is_trusted": fp.is_trusted,
                    "usage_count": fp.usage_count,
                    "first_seen": fp.first_seen.isoformat() if fp.first_seen else None,
                    "last_seen": fp.last_seen.isoformat() if fp.last_seen else None,
                }
                for fp in fps
            ]
        except Exception:
            return []

    @staticmethod
    def get_user_loans(db: Session, user_id: str) -> Dict[str, Any]:
        """Loan data for analyst inspection."""
        try:
            loans = db.query(Loan).filter(Loan.user_id == user_id).order_by(desc(Loan.created_at)).all()
            loan_data = []
            for l in loans:
                repayments = db.query(LoanRepayment).filter(LoanRepayment.loan_id == l.id).all()
                late_count = sum(1 for r in repayments if r.is_late)
                loan_data.append({
                    "id": l.id,
                    "status": l.status,
                    "principal": float(l.principal),
                    "outstanding": float(l.outstanding),
                    "interest_rate": float(l.interest_rate),
                    "term_months": l.term_months,
                    "purpose": l.purpose,
                    "next_due_date": str(l.next_due_date) if l.next_due_date else None,
                    "total_repayments": len(repayments),
                    "late_repayments": late_count,
                    "created_at": l.created_at.isoformat() if l.created_at else None,
                })
            return {
                "loans": loan_data,
                "total": len(loan_data),
                "total_outstanding": sum(float(l.outstanding) for l in loans),
            }
        except Exception:
            return {"loans": [], "total": 0, "total_outstanding": 0}

    # ═══════════════════════════════════════════════════════════
    # Investigation Lifecycle
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def create_investigation(
        db: Session,
        analyst_id: str,
        user_id: str,
        severity: str,
        reason: str,
    ) -> Investigation:
        """Create a new investigation case."""
        # Verify subject exists
        subject = db.query(User).filter(User.id == user_id).first()
        if not subject:
            raise ValueError("Subject user not found")

        inv = Investigation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            opened_by=analyst_id,
            severity=severity,
            reason=reason,
        )
        db.add(inv)

        # Audit log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=analyst_id,
            action="investigation_opened",
            target=user_id,
            event_metadata={
                "investigation_id": inv.id,
                "severity": severity,
                "reason": reason[:200],
            },
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()
        db.refresh(inv)

        logger.info(
            f"Investigation opened: {inv.id} by analyst {analyst_id} on user {user_id}",
            extra={"investigation_id": inv.id, "analyst_id": analyst_id, "user_id": user_id},
        )

        return inv

    @staticmethod
    def get_investigation(db: Session, investigation_id: str) -> Optional[Dict[str, Any]]:
        """Get full investigation detail."""
        inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
        if not inv:
            return None

        subject = db.query(User).filter(User.id == inv.user_id).first()
        analyst = db.query(User).filter(User.id == inv.opened_by).first()

        notes = [
            {
                "id": n.id,
                "analyst_id": n.analyst_id,
                "analyst_name": f"{n.author.first_name} {n.author.last_name}" if n.author else "Unknown",
                "note": n.note,
                "note_type": n.note_type,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in inv.notes
        ]

        recs = [
            {
                "id": r.id,
                "recommended_by": r.recommended_by,
                "analyst_name": f"{r.analyst.first_name} {r.analyst.last_name}" if r.analyst else "Unknown",
                "action": r.action,
                "justification": r.justification,
                "status": r.status,
                "reviewed_by": r.reviewed_by,
                "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
                "review_notes": r.review_notes,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in inv.recommendations
        ]

        risk_context = {
            "risk_score": subject.risk_score if subject else 0,
            "risk_breakdown": subject.risk_breakdown if subject else {},
            "trust_level": subject.trust_level if subject else "unknown",
        }

        return {
            "investigation": {
                "id": inv.id,
                "user_id": inv.user_id,
                "opened_by": inv.opened_by,
                "status": inv.status,
                "severity": inv.severity,
                "reason": inv.reason,
                "summary": inv.summary,
                "closed_at": inv.closed_at.isoformat() if inv.closed_at else None,
                "closed_by": inv.closed_by,
                "escalated_to": inv.escalated_to,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
                "notes_count": len(notes),
                "recommendations_count": len(recs),
            },
            "subject": {
                "id": subject.id if subject else None,
                "email": subject.email if subject else None,
                "first_name": subject.first_name if subject else None,
                "last_name": subject.last_name if subject else None,
                "role": subject.role if subject else None,
                "risk_score": subject.risk_score if subject else 0,
            },
            "analyst": {
                "id": analyst.id if analyst else None,
                "email": analyst.email if analyst else None,
                "first_name": analyst.first_name if analyst else None,
                "last_name": analyst.last_name if analyst else None,
            },
            "notes": notes,
            "recommendations": recs,
            "risk_context": risk_context,
        }

    @staticmethod
    def list_investigations(
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        analyst_id: Optional[str] = None,
        user_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """List investigations with filters."""
        query = db.query(Investigation)

        if status:
            query = query.filter(Investigation.status == status)
        if severity:
            query = query.filter(Investigation.severity == severity)
        if analyst_id:
            query = query.filter(Investigation.opened_by == analyst_id)
        if user_id:
            query = query.filter(Investigation.user_id == user_id)

        total = query.count()
        investigations = (
            query.order_by(desc(Investigation.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        result = []
        for inv in investigations:
            notes_count = db.query(func.count(InvestigationNote.id)).filter(
                InvestigationNote.investigation_id == inv.id
            ).scalar() or 0
            recs_count = db.query(func.count(Recommendation.id)).filter(
                Recommendation.investigation_id == inv.id
            ).scalar() or 0

            subject = db.query(User).filter(User.id == inv.user_id).first()

            result.append({
                "id": inv.id,
                "user_id": inv.user_id,
                "subject_name": f"{subject.first_name} {subject.last_name}" if subject else "Unknown",
                "subject_email": subject.email if subject else None,
                "subject_risk_score": subject.risk_score if subject else 0,
                "opened_by": inv.opened_by,
                "status": inv.status,
                "severity": inv.severity,
                "reason": inv.reason,
                "summary": inv.summary,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
                "notes_count": notes_count,
                "recommendations_count": recs_count,
            })

        return {
            "investigations": result,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    @staticmethod
    def update_investigation(
        db: Session,
        investigation_id: str,
        analyst_id: str,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        summary: Optional[str] = None,
    ) -> Optional[Investigation]:
        """Update investigation status/severity."""
        inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
        if not inv:
            return None

        old_status = inv.status

        if status:
            inv.status = status
            if status == "closed":
                inv.closed_at = datetime.utcnow()
                inv.closed_by = analyst_id
            elif status == "escalated":
                inv.escalated_to = analyst_id  # will be overridden by admin
        if severity:
            inv.severity = severity
        if summary:
            inv.summary = summary

        inv.updated_at = datetime.utcnow()

        # Audit
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=analyst_id,
            action="investigation_updated",
            target=investigation_id,
            event_metadata={
                "old_status": old_status,
                "new_status": status or old_status,
                "severity": severity or inv.severity,
            },
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()
        db.refresh(inv)

        return inv

    # ═══════════════════════════════════════════════════════════
    # Notes
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def add_note(
        db: Session,
        investigation_id: str,
        analyst_id: str,
        note: str,
        note_type: str = "observation",
    ) -> Optional[InvestigationNote]:
        """Add a note to an investigation."""
        inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
        if not inv:
            return None

        # Block notes on closed investigations
        if inv.status == "closed":
            raise ValueError("Cannot add notes to a closed investigation")

        new_note = InvestigationNote(
            id=str(uuid.uuid4()),
            investigation_id=investigation_id,
            analyst_id=analyst_id,
            note=note,
            note_type=note_type,
        )
        db.add(new_note)

        # Audit
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=analyst_id,
            action="investigation_note_added",
            target=investigation_id,
            event_metadata={"note_type": note_type, "note_preview": note[:100]},
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()
        db.refresh(new_note)

        return new_note

    # ═══════════════════════════════════════════════════════════
    # Recommendations
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def add_recommendation(
        db: Session,
        investigation_id: str,
        analyst_id: str,
        action: str,
        justification: str,
    ) -> Optional[Recommendation]:
        """Create a recommendation for an investigation."""
        inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
        if not inv:
            return None

        if inv.status == "closed":
            raise ValueError("Cannot add recommendations to a closed investigation")

        rec = Recommendation(
            id=str(uuid.uuid4()),
            investigation_id=investigation_id,
            recommended_by=analyst_id,
            action=action,
            justification=justification,
        )
        db.add(rec)

        # Audit
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=analyst_id,
            action="recommendation_created",
            target=investigation_id,
            event_metadata={
                "recommendation_id": rec.id,
                "action": action,
                "justification_preview": justification[:100],
            },
            timestamp=datetime.utcnow(),
        )
        db.add(audit)
        db.commit()
        db.refresh(rec)

        logger.info(
            f"Recommendation created: {rec.id} action={action} for investigation {investigation_id}",
            extra={"recommendation_id": rec.id, "investigation_id": investigation_id},
        )

        return rec

    # ═══════════════════════════════════════════════════════════
    # Risk Insights
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def get_risk_insights(db: Session) -> Dict[str, Any]:
        """Aggregated risk insights for analyst dashboard."""
        # Risk distribution
        low = db.query(func.count(User.id)).filter(User.risk_score < 30, User.is_system_user == False).scalar() or 0
        medium = db.query(func.count(User.id)).filter(
            User.risk_score >= 30, User.risk_score < 60, User.is_system_user == False
        ).scalar() or 0
        high = db.query(func.count(User.id)).filter(
            User.risk_score >= 60, User.risk_score < 80, User.is_system_user == False
        ).scalar() or 0
        critical = db.query(func.count(User.id)).filter(
            User.risk_score >= 80, User.is_system_user == False
        ).scalar() or 0

        # Investigation severity breakdown
        inv_severities = db.query(
            Investigation.severity, func.count(Investigation.id)
        ).filter(Investigation.status != "closed").group_by(Investigation.severity).all()

        severity_breakdown = {sev: cnt for sev, cnt in inv_severities}

        # Top risk orgs
        top_orgs = db.query(
            Organization.id,
            Organization.name,
            func.avg(User.risk_score).label("avg_risk"),
            func.count(User.id).label("user_count"),
        ).join(User, User.org_id == Organization.id).filter(
            User.is_system_user == False,
        ).group_by(Organization.id, Organization.name).order_by(
            desc(func.avg(User.risk_score))
        ).limit(10).all()

        top_risk_orgs = [
            {
                "org_id": org_id,
                "org_name": name,
                "avg_risk_score": round(float(avg_risk or 0), 1),
                "user_count": user_count,
            }
            for org_id, name, avg_risk, user_count in top_orgs
        ]

        # Recent patterns - recent risk decisions
        recent_patterns = []
        try:
            recent_decisions = db.query(RiskDecision).order_by(
                desc(RiskDecision.created_at)
            ).limit(10).all()
            for rd in recent_decisions:
                recent_patterns.append({
                    "event_type": rd.event_type,
                    "risk_level": rd.risk_level,
                    "decision": rd.decision,
                    "rules_triggered": rd.triggered_rules or [],
                    "timestamp": rd.created_at.isoformat() if rd.created_at else None,
                })
        except Exception:
            pass

        # Open investigations
        open_inv = db.query(func.count(Investigation.id)).filter(
            Investigation.status.in_(["open", "monitoring", "escalated"])
        ).scalar() or 0

        # Pending recommendations
        pending_recs = db.query(func.count(Recommendation.id)).filter(
            Recommendation.status == "pending"
        ).scalar() or 0

        # Average risk score
        avg_risk = db.query(func.avg(User.risk_score)).filter(
            User.is_system_user == False
        ).scalar() or 0

        # High risk users count
        high_risk_count = db.query(func.count(User.id)).filter(
            User.risk_score >= 60, User.is_system_user == False
        ).scalar() or 0

        return {
            "risk_distribution": {
                "low": low,
                "medium": medium,
                "high": high,
                "critical": critical,
            },
            "severity_breakdown": severity_breakdown,
            "top_risk_orgs": top_risk_orgs,
            "recent_patterns": recent_patterns,
            "open_investigations": open_inv,
            "pending_recommendations": pending_recs,
            "avg_risk_score": round(float(avg_risk), 1),
            "high_risk_users_count": high_risk_count,
        }

    # ═══════════════════════════════════════════════════════════
    # Search
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def search(db: Session, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search across users, investigations, and organizations."""
        results = []
        q = f"%{query}%"

        # Search users
        users = db.query(User).filter(
            or_(
                User.email.ilike(q),
                User.first_name.ilike(q),
                User.last_name.ilike(q),
                User.id.ilike(q),
            ),
            User.is_system_user == False,
        ).limit(limit).all()

        for u in users:
            results.append({
                "result_type": "user",
                "id": u.id,
                "title": f"{u.first_name} {u.last_name}",
                "subtitle": u.email,
                "risk_score": u.risk_score,
                "status": u.status,
                "metadata": {"role": u.role, "org_id": u.org_id},
            })

        # Search investigations
        investigations = db.query(Investigation).filter(
            or_(
                Investigation.id.ilike(q),
                Investigation.reason.ilike(q),
            )
        ).limit(limit).all()

        for inv in investigations:
            results.append({
                "result_type": "investigation",
                "id": inv.id,
                "title": f"Case: {inv.id[:8]}... ({inv.status})",
                "subtitle": inv.reason[:80] if inv.reason else None,
                "risk_score": None,
                "status": inv.status,
                "metadata": {"severity": inv.severity, "user_id": inv.user_id},
            })

        # Search organizations
        orgs = db.query(Organization).filter(
            or_(
                Organization.name.ilike(q),
                Organization.id.ilike(q),
            )
        ).limit(limit).all()

        for org in orgs:
            user_count = db.query(func.count(User.id)).filter(User.org_id == org.id).scalar() or 0
            results.append({
                "result_type": "organization",
                "id": org.id,
                "title": org.name,
                "subtitle": f"{user_count} users",
                "risk_score": None,
                "status": None,
                "metadata": {"user_count": user_count},
            })

        return results[:limit]

    @staticmethod
    def get_organization_detail(db: Session, org_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about an organization and its users."""
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            return None

        # Get all users in this org
        users = db.query(User).filter(
            User.org_id == org_id,
            User.is_system_user == False,
        ).order_by(desc(User.risk_score)).all()

        # Compute aggregate stats
        total_users = len(users)
        active_users = sum(1 for u in users if u.is_active)
        risk_scores = [u.risk_score for u in users if u.risk_score is not None]
        avg_risk = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0
        high_risk_count = sum(1 for s in risk_scores if s >= 70)

        # Open investigations for users in this org
        user_ids = [u.id for u in users]
        open_investigations = 0
        if user_ids:
            open_investigations = db.query(func.count(Investigation.id)).filter(
                Investigation.user_id.in_(user_ids),
                Investigation.status.in_(["open", "monitoring", "escalated"]),
            ).scalar() or 0

        return {
            "organization": {
                "id": org.id,
                "name": org.name,
            },
            "stats": {
                "total_users": total_users,
                "active_users": active_users,
                "avg_risk_score": avg_risk,
                "high_risk_users": high_risk_count,
                "open_investigations": open_investigations,
            },
            "users": [
                {
                    "id": u.id,
                    "email": u.email,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "role": u.role,
                    "risk_score": u.risk_score,
                    "status": u.status,
                    "is_active": u.is_active,
                    "trust_level": u.trust_level,
                    "last_login_at": u.last_login_at.isoformat() + "Z" if u.last_login_at else None,
                    "created_at": u.created_at.isoformat() + "Z" if u.created_at else None,
                }
                for u in users
            ],
        }
