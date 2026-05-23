"""Dynamic interest and penalty evaluation."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Loan, User, generate_uuid
from app.models.fintech_extended import InterestPolicy, LoanRepaymentSchedule

logger = logging.getLogger("sentineliq.interest_engine")


class InterestEngine:
    @staticmethod
    def risk_tier_from_score(score: float) -> str:
        if score >= 800:
            return "critical"
        if score >= 600:
            return "high"
        if score >= 300:
            return "medium"
        return "low"

    @staticmethod
    def get_policy_for_user(db: Session, user: User) -> Optional[InterestPolicy]:
        tier = InterestEngine.risk_tier_from_score(float(user.risk_score or 0))
        policy = (
            db.query(InterestPolicy)
            .filter(InterestPolicy.risk_tier == tier, InterestPolicy.active.is_(True))
            .first()
        )
        if policy:
            return policy
        return (
            db.query(InterestPolicy)
            .filter(InterestPolicy.risk_tier == "medium", InterestPolicy.active.is_(True))
            .first()
        )

    @staticmethod
    def apply_policy_to_loan(db: Session, loan: Loan, user: User) -> InterestPolicy:
        policy = InterestEngine.get_policy_for_user(db, user)
        if not policy:
            policy = InterestPolicy(
                id=generate_uuid(),
                name="Default Medium Tier",
                risk_tier="medium",
                base_rate=Decimal("12.00"),
                penalty_rate=Decimal("2.50"),
                grace_period_days=3,
                active=True,
            )
            db.add(policy)
            db.flush()
        loan.interest_rate = policy.base_rate
        loan.interest_policy_id = policy.id
        return policy

    @staticmethod
    def accrue_penalty(db: Session, loan: Loan, schedule_row: LoanRepaymentSchedule) -> float:
        user = db.query(User).filter(User.id == loan.user_id).first()
        policy = None
        if loan.interest_policy_id:
            policy = db.query(InterestPolicy).filter(InterestPolicy.id == loan.interest_policy_id).first()
        if not policy and user:
            policy = InterestEngine.get_policy_for_user(db, user)
        rate = float(policy.penalty_rate) if policy else 2.5
        penalty = float(schedule_row.expected_amount) * (rate / 100.0)
        return round(penalty, 2)

    @staticmethod
    def simulate(db: Session, loan_id: str) -> dict:
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError("Loan not found")
        user = db.query(User).filter(User.id == loan.user_id).first()
        policy = InterestEngine.apply_policy_to_loan(db, loan, user) if user else None
        outstanding = float(loan.outstanding)
        base_rate = float(policy.base_rate) if policy else float(loan.interest_rate or 12)
        penalty_rate = float(policy.penalty_rate) if policy else 2.5
        projected_interest = outstanding * (base_rate / 100.0) / 12
        projected_penalty = outstanding * (penalty_rate / 100.0) if loan.next_due_date else 0
        return {
            "loan_id": loan.id,
            "risk_tier": policy.risk_tier if policy else "medium",
            "base_rate": base_rate,
            "penalty_rate": penalty_rate,
            "outstanding": outstanding,
            "projected_monthly_interest": round(projected_interest, 2),
            "projected_penalty_if_overdue": round(projected_penalty, 2),
            "policy_id": policy.id if policy else None,
            "policy_name": policy.name if policy else None,
        }

    @staticmethod
    def list_policies(db: Session, active_only: bool = True) -> list[InterestPolicy]:
        q = db.query(InterestPolicy)
        if active_only:
            q = q.filter(InterestPolicy.active.is_(True))
        return q.order_by(InterestPolicy.risk_tier).all()

    @staticmethod
    def create_policy(db: Session, data: dict) -> InterestPolicy:
        policy = InterestPolicy(
            id=generate_uuid(),
            name=data["name"],
            risk_tier=data["risk_tier"],
            base_rate=Decimal(str(data["base_rate"])),
            penalty_rate=Decimal(str(data["penalty_rate"])),
            grace_period_days=int(data.get("grace_period_days", 0)),
            active=data.get("active", True),
        )
        db.add(policy)
        db.flush()
        return policy
