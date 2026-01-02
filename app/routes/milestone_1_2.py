# API Routes: Shadow Mode, Link Analysis, Crypto Audit
# Endpoints for Milestone 1 & 2 features

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.dependencies import get_db, get_current_user
from app.models import User
from app.core.rbac import require_permission, require_role, Permission, ResourceACL, Role
from app.services.shadow_mode import get_shadow_mode_service, ShadowModeService
from app.services.link_analysis import get_link_analysis_service, LinkAnalysisService
from app.services.crypto_audit import get_crypto_audit_service, CryptoChainedAuditService
from app.core.pii_scrubber import log_safe

router = APIRouter(prefix="/api/v1", tags=["Milestone 1 & 2"])


# ========== SHADOW MODE ENDPOINTS ==========

@router.post("/shadow-mode/evaluate")
async def log_shadow_evaluation(
    rule_id: str,
    event_id: str,
    user_id: str,
    would_have_blocked: bool,
    confidence_score: int = Query(..., ge=0, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    shadow_service: ShadowModeService = Depends(get_shadow_mode_service),
):
    """
    Log a shadow mode rule evaluation.
    Called by risk engine after evaluating a shadow rule.
    """
    # Authorization: Data Scientist or Admin
    if not ResourceACL.can_access_shadow_rules(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for shadow mode"
        )
    
    result = shadow_service.log_shadow_evaluation(
        org_id=current_user.org_id,
        rule_id=rule_id,
        event_id=event_id,
        user_id=user_id,
        would_have_blocked=would_have_blocked,
        confidence_score=confidence_score,
    )
    
    return {
        "result_id": result.id,
        "rule_id": rule_id,
        "confidence_score": confidence_score,
        "status": "logged",
    }


@router.post("/shadow-mode/label/{result_id}")
async def label_shadow_result(
    result_id: str,
    actual_fraud: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    shadow_service: ShadowModeService = Depends(get_shadow_mode_service),
):
    """
    Label a shadow result with ground truth (analyst review).
    Example: Analyst confirms a transaction WAS fraud.
    """
    # Authorization: Risk Analyst or Admin
    if current_user.role not in [Role.RISK_ANALYST.value, Role.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Risk Analysts can label shadow results"
        )
    
    result = shadow_service.label_result(
        result_id=result_id,
        actual_fraud=actual_fraud,
        analyst_id=current_user.id,
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found"
        )
    
    return {
        "result_id": result_id,
        "actual_fraud": actual_fraud,
        "status": "labeled",
    }


@router.get("/shadow-mode/accuracy/{rule_id}")
async def get_rule_accuracy(
    rule_id: str,
    time_window_hours: int = Query(48, ge=1, le=720),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    shadow_service: ShadowModeService = Depends(get_shadow_mode_service),
):
    """
    Get accuracy metrics for a shadow rule.
    Metrics: Precision, Recall, F1-Score, Confusion Matrix.
    """
    # Authorization: Data Scientist, Risk Analyst, or Admin
    if not ResourceACL.can_access_shadow_rules(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    accuracy = shadow_service.calculate_rule_accuracy(
        rule_id=rule_id,
        org_id=current_user.org_id,
        time_window_hours=time_window_hours,
    )
    
    return accuracy


@router.get("/shadow-mode/trends/{rule_id}")
async def get_accuracy_trends(
    rule_id: str,
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    shadow_service: ShadowModeService = Depends(get_shadow_mode_service),
):
    """
    Get daily accuracy trends for a shadow rule.
    Shows if accuracy is improving over time.
    """
    if not ResourceACL.can_access_shadow_rules(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    trends = shadow_service.get_accuracy_trends(
        rule_id=rule_id,
        org_id=current_user.org_id,
        days=days,
    )
    
    return {"rule_id": rule_id, "trends": trends}


@router.get("/shadow-mode/pending-labels")
async def get_pending_labels(
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    shadow_service: ShadowModeService = Depends(get_shadow_mode_service),
):
    """
    Get unlabeled shadow results waiting for analyst review.
    """
    if current_user.role not in [Role.RISK_ANALYST.value, Role.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Risk Analysts can review pending labels"
        )
    
    results = shadow_service.get_pending_labels(
        org_id=current_user.org_id,
        limit=limit,
    )
    
    return {
        "pending_count": len(results),
        "results": [
            {
                "result_id": r.id,
                "rule_id": r.rule_id,
                "user_id": r.user_id,
                "would_have_blocked": r.would_have_blocked,
                "confidence_score": r.confidence_score,
                "timestamp": r.timestamp,
            }
            for r in results
        ],
    }


# ========== LINK ANALYSIS ENDPOINTS ==========

@router.get("/link-analysis/user/{user_id}")
async def get_user_links(
    user_id: str,
    connection_types: Optional[List[str]] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    link_service: LinkAnalysisService = Depends(get_link_analysis_service),
):
    """
    Get direct connections for a user.
    Shows all users linked via IP, device, email domain, etc.
    """
    # Authorization: Risk Analyst, SOC Responder, or Admin
    if not ResourceACL.can_access_org_data(current_user, current_user.org_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    connections = link_service.get_user_connections(
        org_id=current_user.org_id,
        user_id=user_id,
        connection_types=connection_types,
    )
    
    return {
        "user_id": user_id,
        "connection_count": len(connections),
        "connections": connections,
    }


@router.get("/link-analysis/ring/{user_id}")
async def analyze_fraud_ring(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    link_service: LinkAnalysisService = Depends(get_link_analysis_service),
):
    """
    Analyze a fraud ring around a user.
    Uses NetworkX for community detection and centrality analysis.
    """
    if current_user.role not in [Role.RISK_ANALYST.value, Role.SOC_RESPONDER.value, Role.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    ring_analysis = link_service.analyze_fraud_ring(
        org_id=current_user.org_id,
        user_id=user_id,
    )
    
    return ring_analysis or {"error": "NetworkX not installed"}


@router.get("/link-analysis/hubs")
async def get_top_hubs(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    link_service: LinkAnalysisService = Depends(get_link_analysis_service),
):
    """
    Get users with most connections (potential ring hubs).
    Useful for identifying key players in fraud rings.
    """
    if not ResourceACL.can_access_org_data(current_user, current_user.org_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    hubs = link_service.get_top_hubs(
        org_id=current_user.org_id,
        limit=limit,
    )
    
    return {"top_hubs": hubs}


@router.get("/link-analysis/graph/{user_id}")
async def get_graph_data(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    link_service: LinkAnalysisService = Depends(get_link_analysis_service),
):
    """
    Get graph data for Cytoscape.js visualization.
    Suitable for frontend network rendering.
    """
    if not ResourceACL.can_access_org_data(current_user, current_user.org_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    graph_data = link_service.get_graph_data(
        org_id=current_user.org_id,
        user_id=user_id,
        include_risk_scores=True,
    )
    
    return graph_data


@router.post("/link-analysis/flag-ring")
async def flag_ring(
    user_ids: List[str],
    reason: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    link_service: LinkAnalysisService = Depends(get_link_analysis_service),
):
    """
    Flag a group of users as a fraud ring.
    """
    # Authorization: Admin only
    if current_user.role != Role.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can flag rings"
        )
    
    link_service.flag_ring(
        org_id=current_user.org_id,
        user_ids=user_ids,
        reason=reason,
    )
    
    return {"status": "ring flagged", "user_count": len(user_ids)}


# ========== CRYPTO AUDIT ENDPOINTS ==========

@router.get("/audit/logs")
async def get_audit_logs(
    event_type: Optional[str] = None,
    actor_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    audit_service: CryptoChainedAuditService = Depends(get_crypto_audit_service),
):
    """
    Query audit logs with filters.
    Authorization: Compliance Officer or Admin.
    """
    # Authorization: Compliance Officer or Admin
    if current_user.role not in [Role.COMPLIANCE_OFFICER.value, Role.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Compliance Officers and Admins can access audit logs"
        )
    
    logs = audit_service.get_logs(
        org_id=current_user.org_id,
        event_type=event_type,
        actor_id=actor_id,
        resource_type=resource_type,
        limit=limit,
    )
    
    return {
        "total": len(logs),
        "logs": [
            {
                "id": log.id,
                "event_type": log.event_type,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "actor_id": log.actor_id,
                "timestamp": log.timestamp,
                "hash": log.current_hash[:16] + "...",
            }
            for log in logs
        ],
    }


@router.get("/audit/verify")
async def verify_audit_chain(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    audit_service: CryptoChainedAuditService = Depends(get_crypto_audit_service),
):
    """
    Verify integrity of audit log chain (for compliance reports).
    Run this before SOC 2 audit to prove immutability.
    """
    # Authorization: Compliance Officer or Admin
    if current_user.role not in [Role.COMPLIANCE_OFFICER.value, Role.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Compliance Officers can verify audit chain"
        )
    
    integrity = audit_service.verify_chain_integrity(
        org_id=current_user.org_id,
    )
    
    return integrity


@router.get("/audit/compliance-report")
async def generate_compliance_report(
    report_type: str = Query("soc2", regex="^(soc2|pci_dss|gdpr|ofac)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    audit_service: CryptoChainedAuditService = Depends(get_crypto_audit_service),
):
    """
    Generate compliance report from audit logs.
    Reports: SOC 2, PCI-DSS, GDPR, OFAC.
    """
    # Authorization: Compliance Officer or Admin
    if current_user.role not in [Role.COMPLIANCE_OFFICER.value, Role.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Compliance Officers can generate reports"
        )
    
    report = audit_service.generate_compliance_report(
        org_id=current_user.org_id,
        report_type=report_type,
    )
    
    return report


@router.get("/audit/stats")
async def get_audit_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    audit_service: CryptoChainedAuditService = Depends(get_crypto_audit_service),
):
    """
    Get audit log statistics.
    """
    if current_user.role not in [Role.COMPLIANCE_OFFICER.value, Role.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Compliance Officers can view audit statistics"
        )
    
    stats = audit_service.get_stats(org_id=current_user.org_id)
    return stats
