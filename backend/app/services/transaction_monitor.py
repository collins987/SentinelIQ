"""Internal transaction ledger, velocity checks, and spending alerts."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import SecurityAlert, User, generate_uuid
from app.models.fintech_extended import (
    FintechTransaction,
    SpendingAlert,
    GlobalTransactionThreshold,
)

logger = logging.getLogger("sentineliq.transaction_monitor")


class TransactionMonitor:
    @staticmethod
    def _get_global_thresholds(db: Session) -> GlobalTransactionThreshold:
        row = db.query(GlobalTransactionThreshold).filter(GlobalTransactionThreshold.id == "default").first()
        if not row:
            row = GlobalTransactionThreshold(id="default")
            db.add(row)
            db.flush()
        return row

    @staticmethod
    def _emit(stream: str, event_type: str, payload: dict) -> None:
        try:
            from app.services.redis_stream import get_redis_stream_manager

            mgr = get_redis_stream_manager()
            if mgr and mgr._connected:
                mgr._redis.xadd(stream, {"event_type": event_type, "payload": json.dumps(payload)})
        except Exception as exc:
            logger.warning("Redis emit failed: %s", exc)

    @staticmethod
    def record_transaction(
        db: Session,
        user_id: str,
        amount: float,
        txn_type: str,
        loan_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> FintechTransaction:
        risk_score = TransactionMonitor._score_transaction(db, user_id, amount)
        txn = FintechTransaction(
            id=generate_uuid(),
            user_id=user_id,
            loan_id=loan_id,
            type=txn_type,
            amount=Decimal(str(amount)),
            status="completed",
            risk_score=Decimal(str(risk_score)),
            transaction_metadata=metadata or {},
        )
        db.add(txn)
        db.flush()

        TransactionMonitor._check_spending_limits(db, user_id, amount)
        if risk_score >= 70:
            TransactionMonitor._create_anomaly_alert(db, user_id, txn, risk_score)

        TransactionMonitor._emit(
            "sentineliq:transactions",
            "transaction.recorded",
            {"user_id": user_id, "amount": amount, "type": txn_type, "risk_score": risk_score},
        )
        return txn

    @staticmethod
    def _score_transaction(db: Session, user_id: str, amount: float) -> float:
        since = datetime.utcnow() - timedelta(hours=24)
        count = (
            db.query(func.count(FintechTransaction.id))
            .filter(
                FintechTransaction.user_id == user_id,
                FintechTransaction.created_at >= since,
            )
            .scalar()
            or 0
        )
        total = (
            db.query(func.coalesce(func.sum(FintechTransaction.amount), 0))
            .filter(
                FintechTransaction.user_id == user_id,
                FintechTransaction.created_at >= since,
            )
            .scalar()
            or 0
        )
        score = min(100.0, (count * 8) + (float(total) / max(amount, 1)) * 5)
        if amount > 100000:
            score = min(100.0, score + 25)
        return round(score, 2)

    @staticmethod
    def _check_spending_limits(db: Session, user_id: str, amount: float) -> None:
        cfg = db.query(SpendingAlert).filter(SpendingAlert.user_id == user_id).first()
        if not cfg or not cfg.notify:
            return
        since = datetime.utcnow() - timedelta(days=1)
        daily_total = (
            db.query(func.coalesce(func.sum(FintechTransaction.amount), 0))
            .filter(
                FintechTransaction.user_id == user_id,
                FintechTransaction.created_at >= since,
            )
            .scalar()
            or 0
        )
        if cfg.daily_limit and float(daily_total) > float(cfg.daily_limit):
            db.add(
                SecurityAlert(
                    id=generate_uuid(),
                    user_id=user_id,
                    alert_type="spending_limit",
                    severity="warning",
                    title="Daily spending limit exceeded",
                    message=f"Daily total Ksh.{float(daily_total):,.0f} exceeds your limit.",
                    alert_metadata={"daily_total": float(daily_total)},
                )
            )
            TransactionMonitor._emit("ops.alerts.spending", "spending.limit.exceeded", {"user_id": user_id})

    @staticmethod
    def _create_anomaly_alert(db: Session, user_id: str, txn: FintechTransaction, score: float) -> None:
        db.add(
            SecurityAlert(
                id=generate_uuid(),
                user_id=user_id,
                alert_type="transaction_anomaly",
                severity="high" if score >= 85 else "medium",
                title="Unusual transaction activity",
                message=f"Transaction Ksh.{float(txn.amount):,.0f} flagged (risk score {score}).",
                alert_metadata={"transaction_id": txn.id, "risk_score": score},
            )
        )

    @staticmethod
    def list_user_transactions(db: Session, user_id: str, limit: int = 50) -> list[FintechTransaction]:
        return (
            db.query(FintechTransaction)
            .filter(FintechTransaction.user_id == user_id)
            .order_by(FintechTransaction.created_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def list_anomalies(db: Session, min_score: float = 70, limit: int = 50) -> list[dict]:
        rows = (
            db.query(FintechTransaction, User.email)
            .join(User, User.id == FintechTransaction.user_id)
            .filter(FintechTransaction.risk_score >= min_score)
            .order_by(FintechTransaction.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": t.id,
                "user_id": t.user_id,
                "user_email": email,
                "type": t.type,
                "amount": float(t.amount),
                "risk_score": float(t.risk_score),
                "status": t.status,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "metadata": t.transaction_metadata or {},
            }
            for t, email in rows
        ]

    @staticmethod
    def get_or_create_spending_alert(db: Session, user_id: str) -> SpendingAlert:
        row = db.query(SpendingAlert).filter(SpendingAlert.user_id == user_id).first()
        if not row:
            row = SpendingAlert(id=generate_uuid(), user_id=user_id)
            db.add(row)
            db.flush()
        return row

    @staticmethod
    def update_spending_alert(db: Session, user_id: str, data: dict) -> SpendingAlert:
        row = TransactionMonitor.get_or_create_spending_alert(db, user_id)
        for key in ("daily_limit", "weekly_limit", "monthly_limit", "notify"):
            if key in data and data[key] is not None:
                setattr(row, key, data[key])
        row.updated_at = datetime.utcnow()
        return row

    @staticmethod
    def update_global_thresholds(db: Session, data: dict) -> GlobalTransactionThreshold:
        row = TransactionMonitor._get_global_thresholds(db)
        for key in ("daily_velocity_limit", "weekly_velocity_limit", "anomaly_score_threshold"):
            if key in data and data[key] is not None:
                setattr(row, key, data[key])
        return row

    @staticmethod
    def admin_transaction_alerts(db: Session, severity: Optional[str] = None, limit: int = 50) -> list[dict]:
        q = db.query(SecurityAlert).filter(
            SecurityAlert.alert_type.in_(["transaction_anomaly", "spending_limit"])
        )
        if severity:
            q = q.filter(SecurityAlert.severity == severity)
        alerts = q.order_by(SecurityAlert.created_at.desc()).limit(limit).all()
        return [
            {
                "id": a.id,
                "user_id": a.user_id,
                "severity": a.severity,
                "title": a.title,
                "message": a.message,
                "alert_type": a.alert_type,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "metadata": a.alert_metadata or {},
            }
            for a in alerts
        ]
