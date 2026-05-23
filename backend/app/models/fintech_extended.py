"""Extended fintech models: schedules, interest policies, transactions, spending alerts."""

from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, JSON, Numeric, Date, Integer
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import Base, generate_uuid


class LoanRepaymentSchedule(Base):
    __tablename__ = "loan_repayment_schedule"

    id = Column(String, primary_key=True, default=generate_uuid)
    loan_id = Column(String, ForeignKey("loans.id"), nullable=False, index=True)
    installment_number = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    expected_amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String, default="pending")  # pending, paid, overdue, waived
    penalty_applied = Column(Numeric(12, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    loan = relationship("Loan", backref="schedule_rows")


class InterestPolicy(Base):
    __tablename__ = "interest_policies"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    risk_tier = Column(String, nullable=False)  # low, medium, high, critical
    base_rate = Column(Numeric(5, 2), nullable=False)
    penalty_rate = Column(Numeric(5, 2), nullable=False)
    grace_period_days = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FintechTransaction(Base):
    __tablename__ = "fintech_transactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    loan_id = Column(String, ForeignKey("loans.id"), nullable=True)
    type = Column(String, nullable=False)  # repayment, disbursement, fee, transfer
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String, default="completed")
    risk_score = Column(Numeric(4, 2), default=0)
    transaction_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", backref="fintech_transactions")


class SpendingAlert(Base):
    __tablename__ = "spending_alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    daily_limit = Column(Numeric(12, 2), nullable=True)
    weekly_limit = Column(Numeric(12, 2), nullable=True)
    monthly_limit = Column(Numeric(12, 2), nullable=True)
    notify = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GlobalTransactionThreshold(Base):
    """Singleton-style global thresholds for transaction monitoring."""

    __tablename__ = "global_transaction_thresholds"

    id = Column(String, primary_key=True, default="default")
    daily_velocity_limit = Column(Numeric(12, 2), default=500000)
    weekly_velocity_limit = Column(Numeric(12, 2), default=2000000)
    anomaly_score_threshold = Column(Numeric(4, 2), default=70)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
