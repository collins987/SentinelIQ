# Cryptographically-Chained Audit Logs
# Immutable audit trail with SHA-256 chaining for compliance

import hashlib
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import Depends
from app.dependencies import get_db
from app.models import CryptoChainedAuditLog, User

logger = logging.getLogger(__name__)


# ========== CRYPTO-CHAINED AUDIT LOG SERVICE ==========

class CryptoChainedAuditService:
    """
    Immutable audit logs using SHA-256 chaining.
    Each log entry includes the hash of the previous entry.
    Tampering breaks the chain, detected on verification.
    
    Compliance Use Cases:
    - SOC 2 Type II: Audit trail for system changes
    - PCI-DSS: Cardholder data access logging
    - GDPR: Data processing audit trail
    - OFAC: Sanctions list access verification
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ========== LOGGING ==========
    
    def log_event(
        self,
        org_id: str,
        actor_id: Optional[str],
        event_type: str,
        resource_type: str,
        resource_id: str,
        payload: Dict[str, Any],
        actor_role: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        is_shadow_mode: bool = False,
    ) -> CryptoChainedAuditLog:
        """
        Log an event with cryptographic chaining.
        
        Example:
            service.log_event(
                org_id="org_123",
                actor_id="user_456",
                event_type="rule_updated",
                resource_type="rule",
                resource_id="rule_velocity_check",
                payload={
                    "old_threshold": 5,
                    "new_threshold": 10,
                    "reason": "Reducing false positives"
                },
                actor_role="admin"
            )
        """
        
        # [1] Get previous hash
        previous_log = self.db.query(CryptoChainedAuditLog).filter(
            CryptoChainedAuditLog.organization_id == org_id
        ).order_by(
            CryptoChainedAuditLog.timestamp.desc()
        ).first()
        
        previous_hash = previous_log.current_hash if previous_log else None
        
        # [2] Scrub PII from payload
        scrubbed_payload = self._scrub_payload(payload)
        
        # [3] Calculate current hash
        current_hash = self._calculate_hash(
            previous_hash=previous_hash,
            actor_id=actor_id,
            event_type=event_type,
            payload=scrubbed_payload,
            timestamp=datetime.utcnow().isoformat(),
        )
        
        # [4] Create log entry
        log_entry = CryptoChainedAuditLog(
            organization_id=org_id,
            previous_hash=previous_hash,
            current_hash=current_hash,
            actor_id=actor_id,
            actor_role=actor_role,
            event_type=event_type,
            resource_type=resource_type,
            resource_id=resource_id,
            payload_json=scrubbed_payload,
            is_shadow_mode=is_shadow_mode,
            timestamp=datetime.utcnow(),
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        self.db.add(log_entry)
        self.db.commit()
        
        logger.info(
            f"[AUDIT LOG] {event_type} by {actor_id}: "
            f"{resource_type}/{resource_id} "
            f"(Hash: {current_hash[:16]}...)"
        )
        
        return log_entry
    
    # ========== CRYPTOGRAPHIC HASHING ==========
    
    @staticmethod
    def _calculate_hash(
        previous_hash: Optional[str],
        actor_id: Optional[str],
        event_type: str,
        payload: Dict[str, Any],
        timestamp: str,
    ) -> str:
        """
        Calculate SHA-256 hash for audit log entry.
        Chain: H(previous_hash || actor_id || event_type || payload || timestamp)
        """
        
        # Build string to hash
        chain_input = (
            (previous_hash or "") +
            (actor_id or "") +
            event_type +
            json.dumps(payload, sort_keys=True) +
            timestamp
        )
        
        # Calculate SHA-256
        hash_object = hashlib.sha256(chain_input.encode())
        return hash_object.hexdigest()
    
    @staticmethod
    def _scrub_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive data from audit log payload."""
        # List of fields to scrub
        sensitive_fields = {
            'password', 'password_hash', 'secret', 'api_key',
            'credit_card', 'cvv', 'ssn', 'email', 'phone',
            'account_number', 'iban',
        }
        
        scrubbed = {}
        for key, value in payload.items():
            if any(s in key.lower() for s in sensitive_fields):
                scrubbed[key] = "[REDACTED]"
            elif isinstance(value, dict):
                scrubbed[key] = CryptoChainedAuditService._scrub_payload(value)
            elif isinstance(value, list):
                scrubbed[key] = [
                    CryptoChainedAuditService._scrub_payload(v)
                    if isinstance(v, dict) else v
                    for v in value
                ]
            else:
                scrubbed[key] = value
        
        return scrubbed
    
    # ========== VERIFICATION ==========
    
    def verify_chain_integrity(
        self,
        org_id: str,
    ) -> Dict[str, Any]:
        """
        Verify the integrity of the audit log chain.
        Returns tampering report.
        
        Usage: Run before generating SOC 2 report to prove immutability.
        """
        
        logs = self.db.query(CryptoChainedAuditLog).filter(
            CryptoChainedAuditLog.organization_id == org_id
        ).order_by(
            CryptoChainedAuditLog.timestamp.asc()
        ).all()
        
        if not logs:
            return {
                "org_id": org_id,
                "total_logs": 0,
                "integrity_verified": True,
                "tampering_detected": False,
                "first_log": None,
                "last_log": None,
            }
        
        # [1] Verify each log's hash
        issues = []
        
        for i, log in enumerate(logs):
            # Recalculate expected hash
            expected_hash = self._calculate_hash(
                previous_hash=log.previous_hash,
                actor_id=log.actor_id,
                event_type=log.event_type,
                payload=log.payload_json,
                timestamp=log.timestamp.isoformat(),
            )
            
            # Check if it matches
            if expected_hash != log.current_hash:
                issues.append({
                    "log_index": i,
                    "log_id": log.id,
                    "timestamp": log.timestamp,
                    "event": log.event_type,
                    "expected_hash": expected_hash,
                    "actual_hash": log.current_hash,
                    "status": "TAMPERING DETECTED",
                })
                logger.error(
                    f"[AUDIT INTEGRITY] Tampering detected in log {log.id}: "
                    f"Hash mismatch at {log.timestamp}"
                )
            
            # Verify chain linkage (unless first log)
            if i > 0 and logs[i-1].current_hash != log.previous_hash:
                issues.append({
                    "log_index": i,
                    "log_id": log.id,
                    "timestamp": log.timestamp,
                    "event": log.event_type,
                    "expected_previous_hash": logs[i-1].current_hash,
                    "actual_previous_hash": log.previous_hash,
                    "status": "CHAIN BROKEN",
                })
                logger.error(
                    f"[AUDIT INTEGRITY] Chain broken at log {log.id}: "
                    f"Previous hash mismatch"
                )
        
        return {
            "org_id": org_id,
            "total_logs": len(logs),
            "integrity_verified": len(issues) == 0,
            "tampering_detected": len(issues) > 0,
            "issues": issues,
            "first_log": {
                "id": logs[0].id,
                "timestamp": logs[0].timestamp,
                "event": logs[0].event_type,
            },
            "last_log": {
                "id": logs[-1].id,
                "timestamp": logs[-1].timestamp,
                "event": logs[-1].event_type,
            },
        }
    
    # ========== REPORTING ==========
    
    def get_logs(
        self,
        org_id: str,
        event_type: Optional[str] = None,
        actor_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[CryptoChainedAuditLog]:
        """
        Query audit logs with filters.
        """
        query = self.db.query(CryptoChainedAuditLog).filter(
            CryptoChainedAuditLog.organization_id == org_id
        )
        
        if event_type:
            query = query.filter(CryptoChainedAuditLog.event_type == event_type)
        
        if actor_id:
            query = query.filter(CryptoChainedAuditLog.actor_id == actor_id)
        
        if resource_type:
            query = query.filter(CryptoChainedAuditLog.resource_type == resource_type)
        
        return query.order_by(
            CryptoChainedAuditLog.timestamp.desc()
        ).limit(limit).all()
    
    def generate_compliance_report(
        self,
        org_id: str,
        report_type: str = "soc2",  # soc2, pci_dss, gdpr, ofac
    ) -> Dict[str, Any]:
        """
        Generate compliance report from audit logs.
        """
        
        integrity = self.verify_chain_integrity(org_id)
        
        logs = self.get_logs(org_id, limit=10000)
        
        # Build statistics
        event_counts = {}
        actor_counts = {}
        
        for log in logs:
            event_counts[log.event_type] = event_counts.get(log.event_type, 0) + 1
            if log.actor_id:
                actor_counts[log.actor_id] = actor_counts.get(log.actor_id, 0) + 1
        
        report = {
            "report_type": report_type,
            "organization_id": org_id,
            "generated_at": datetime.utcnow().isoformat(),
            "integrity_status": "✅ VERIFIED" if integrity["integrity_verified"] else "❌ COMPROMISED",
            "total_logs": integrity["total_logs"],
            "total_logs_reviewed": len(logs),
            "event_summary": event_counts,
            "actor_summary": actor_counts,
            "time_span": {
                "first_log": integrity.get("first_log", {}).get("timestamp"),
                "last_log": integrity.get("last_log", {}).get("timestamp"),
            },
        }
        
        if report_type == "soc2":
            report["controls"] = {
                "CC6.1": "Logical access control",
                "CC6.2": "Management authorization",
                "CC7.2": "Monitoring audit logs",
                "CC9.2": "Configuration management",
            }
        elif report_type == "pci_dss":
            report["requirements"] = {
                "Req 10.1": "All access to logs is tracked",
                "Req 10.2": "User actions are logged",
                "Req 10.3": "Log data is protected",
            }
        elif report_type == "gdpr":
            report["articles"] = {
                "Article 5": "Lawfulness and transparency",
                "Article 32": "Security of processing",
            }
        
        return report
    
    # ========== STATISTICS ==========
    
    def get_stats(self, org_id: str) -> Dict[str, Any]:
        """Get audit log statistics."""
        total = self.db.query(CryptoChainedAuditLog).filter(
            CryptoChainedAuditLog.organization_id == org_id
        ).count()
        
        by_event_type = self.db.query(
            CryptoChainedAuditLog.event_type,
            func.count(CryptoChainedAuditLog.id)
        ).filter(
            CryptoChainedAuditLog.organization_id == org_id
        ).group_by(
            CryptoChainedAuditLog.event_type
        ).all()
        
        return {
            "organization_id": org_id,
            "total_logs": total,
            "by_event_type": {event: count for event, count in by_event_type},
        }


# ========== HELPER FUNCTION ==========

def get_crypto_audit_service(db: Session = Depends(get_db)) -> CryptoChainedAuditService:
    """Dependency: Get crypto-chained audit service."""
    return CryptoChainedAuditService(db)
