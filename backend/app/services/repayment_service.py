"""Repayment scheduling, verification, overdue detection, and risk events."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models import Loan, LoanRepayment, SecurityAlert, AuditLog, User, generate_uuid
from app.models.fintech_extended import LoanRepaymentSchedule, FintechTransaction
from app.services.interest_engine import InterestEngine
from app.services.transaction_monitor import TransactionMonitor

logger = logging.getLogger("sentineliq.repayment_service")


class RepaymentService:
    @staticmethod
    def _emit_redis(stream: str, event_type: str, payload: dict) -> None:
        try:
            from app.services.redis_stream import get_redis_stream_manager

            mgr = get_redis_stream_manager()
            if mgr and mgr._connected:
                mgr._redis.xadd(
                    stream,
                    {"event_type": event_type, "payload": json.dumps(payload)},
                )
        except Exception as exc:
            logger.warning("Redis stream emit failed: %s", exc)

    @staticmethod
    def sync_schedule_from_loan(db: Session, loan: Loan) -> list[LoanRepaymentSchedule]:
        """Ensure normalized schedule rows exist from loan JSON schedule."""
        existing = (
            db.query(LoanRepaymentSchedule)
            .filter(LoanRepaymentSchedule.loan_id == loan.id)
            .count()
        )
        if existing:
            return (
                db.query(LoanRepaymentSchedule)
                .filter(LoanRepaymentSchedule.loan_id == loan.id)
                .order_by(LoanRepaymentSchedule.installment_number)
                .all()
            )

        rows: list[LoanRepaymentSchedule] = []
        schedule = loan.repayment_schedule or []
        for idx, item in enumerate(schedule, start=1):
            due_raw = item.get("due_date") or item.get("date")
            due = datetime.fromisoformat(due_raw).date() if isinstance(due_raw, str) else loan.next_due_date
            amount = item.get("amount") or item.get("expected_amount") or float(loan.outstanding) / max(
                len(schedule), 1
            )
            row = LoanRepaymentSchedule(
                id=generate_uuid(),
                loan_id=loan.id,
                installment_number=idx,
                due_date=due or date.today(),
                expected_amount=Decimal(str(amount)),
                status="pending",
            )
            db.add(row)
            rows.append(row)
        if rows:
            db.flush()
        return rows

    @staticmethod
    def get_schedule(db: Session, loan: Loan) -> list[dict]:
        rows = RepaymentService.sync_schedule_from_loan(db, loan)
        return [
            {
                "id": r.id,
                "installment_number": r.installment_number,
                "due_date": r.due_date.isoformat() if r.due_date else None,
                "expected_amount": float(r.expected_amount),
                "status": r.status,
                "penalty_applied": float(r.penalty_applied or 0),
            }
            for r in rows
        ]

    @staticmethod
    def list_repayments(db: Session, loan_id: str) -> list[LoanRepayment]:
        return (
            db.query(LoanRepayment)
            .filter(LoanRepayment.loan_id == loan_id)
            .order_by(LoanRepayment.created_at.desc())
            .all()
        )

    @staticmethod
    def mark_overdue_installments(db: Session, loan: Loan) -> int:
        today = date.today()
        count = 0
        rows = RepaymentService.sync_schedule_from_loan(db, loan)
        for row in rows:
            if row.status == "pending" and row.due_date and row.due_date < today:
                row.status = "overdue"
                penalty = InterestEngine.accrue_penalty(db, loan, row)
                row.penalty_applied = Decimal(str(penalty))
                count += 1
        return count

    @staticmethod
    def process_repayment(
        db: Session,
        loan: Loan,
        user: User,
        amount: float,
        payment_method: str,
        payment_reference: Optional[str] = None,
    ) -> tuple[LoanRepayment, dict]:
        if loan.repayments_frozen:
            raise ValueError("Repayments are frozen on this loan")

        RepaymentService.mark_overdue_installments(db, loan)

        is_late = bool(loan.next_due_date and date.today() > loan.next_due_date)
        verification_status = "pending" if payment_reference and amount >= 50000 else "verified"

        repayment = LoanRepayment(
            id=generate_uuid(),
            loan_id=loan.id,
            user_id=user.id,
            payer_name=f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or None,
            payer_org_id=getattr(user, "org_id", None),
            payment_method=payment_method,
            payment_reference=payment_reference,
            amount=Decimal(str(amount)),
            status="completed" if verification_status == "verified" else "pending",
            due_date=loan.next_due_date,
            paid_at=datetime.utcnow() if verification_status == "verified" else None,
            is_late=is_late,
            verification_status=verification_status,
        )
        db.add(repayment)

        if verification_status == "verified":
            loan.outstanding = Decimal(str(max(0, float(loan.outstanding) - amount)))
            loan.last_repayment_at = datetime.utcnow()
            if loan.next_due_date:
                loan.next_due_date = (
                    datetime.combine(loan.next_due_date, datetime.min.time()) + timedelta(days=30)
                ).date()
            if float(loan.outstanding) <= 0:
                loan.status = "closed"
                loan.outstanding = Decimal("0")
                loan.closed_at = datetime.utcnow()

            rows = RepaymentService.sync_schedule_from_loan(db, loan)
            for row in rows:
                if row.status in ("pending", "overdue"):
                    row.status = "paid"
                    break

        txn = TransactionMonitor.record_transaction(
            db,
            user_id=user.id,
            loan_id=loan.id,
            txn_type="repayment",
            amount=amount,
            metadata={"payment_method": payment_method, "reference": payment_reference},
        )

        risk_impact = 60 if is_late else -50
        event_type = "repayment.overdue" if is_late else "repayment.completed"
        RepaymentService._emit_redis(
            "sentineliq:repayments",
            event_type,
            {"loan_id": loan.id, "user_id": user.id, "amount": amount, "is_late": is_late},
        )

        if is_late or verification_status == "pending":
            db.add(
                SecurityAlert(
                    id=generate_uuid(),
                    user_id=user.id,
                    alert_type="loan_repayment",
                    severity="warning" if verification_status == "pending" else "high",
                    title="Repayment requires attention",
                    message=(
                        f"Repayment of Ksh.{amount} is pending verification."
                        if verification_status == "pending"
                        else f"Late repayment of Ksh.{amount} recorded."
                    ),
                    alert_metadata={"loan_id": loan.id, "repayment_id": repayment.id},
                )
            )

        db.add(
            AuditLog(
                id=generate_uuid(),
                actor_id=user.id,
                action="loan_repayment",
                target=loan.id,
                event_metadata={
                    "amount": amount,
                    "is_late": is_late,
                    "verification_status": verification_status,
                    "transaction_id": txn.id,
                    "risk_impact": risk_impact,
                },
                timestamp=datetime.utcnow(),
            )
        )

        breakdown = user.risk_breakdown or {"identity": 0, "behavior": 0, "financial": 0, "compliance": 0}
        breakdown["financial"] = max(0, breakdown.get("financial", 0) + risk_impact)
        user.risk_breakdown = breakdown
        user.risk_score = sum(breakdown.values())
        user.updated_at = datetime.utcnow()

        return repayment, {"risk_impact": risk_impact, "transaction_id": txn.id}

    @staticmethod
    def verify_repayment(db: Session, repayment_id: str, admin_id: str, approve: bool) -> LoanRepayment:
        rep = db.query(LoanRepayment).filter(LoanRepayment.id == repayment_id).first()
        if not rep:
            raise ValueError("Repayment not found")
        if approve:
            rep.verification_status = "verified"
            rep.status = "completed"
            rep.verified_by = admin_id
            rep.paid_at = datetime.utcnow()
            loan = db.query(Loan).filter(Loan.id == rep.loan_id).first()
            if loan:
                loan.outstanding = Decimal(str(max(0, float(loan.outstanding) - float(rep.amount))))
        else:
            rep.verification_status = "rejected"
            rep.status = "failed"
            rep.verified_by = admin_id
        return rep

    @staticmethod
    @staticmethod
    def list_pending_verification(db: Session, limit: int = 50) -> list[dict]:
        reps = (
            db.query(LoanRepayment)
            .filter(LoanRepayment.verification_status == "pending")
            .order_by(LoanRepayment.created_at.desc())
            .limit(limit)
            .all()
        )
        out = []
        for rep in reps:
            user = db.query(User).filter(User.id == rep.user_id).first()
            out.append(
                {
                    "repayment_id": rep.id,
                    "loan_id": rep.loan_id,
                    "user_id": rep.user_id,
                    "user_email": user.email if user else None,
                    "amount": float(rep.amount),
                    "payment_reference": rep.payment_reference,
                    "created_at": rep.created_at.isoformat() if rep.created_at else None,
                }
            )
        return out

    @staticmethod
    def list_overdue_queue(db: Session, limit: int = 50) -> list[dict]:
        today = date.today()
        loans = db.query(Loan).filter(Loan.status == "active").all()
        queue: list[dict] = []
        for loan in loans:
            RepaymentService.mark_overdue_installments(db, loan)
            if loan.next_due_date and loan.next_due_date < today:
                user = db.query(User).filter(User.id == loan.user_id).first()
                queue.append(
                    {
                        "loan_id": loan.id,
                        "user_id": loan.user_id,
                        "user_email": user.email if user else None,
                        "outstanding": float(loan.outstanding),
                        "next_due_date": loan.next_due_date.isoformat(),
                        "days_overdue": (today - loan.next_due_date).days,
                        "repayments_frozen": bool(loan.repayments_frozen),
                    }
                )
        queue.sort(key=lambda x: x["days_overdue"], reverse=True)
        return queue[:limit]
