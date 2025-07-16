"""
API endpoints for enhanced merchant security features.

Track A Phase 3: Enhanced merchant-specific security and access control
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.security.merchant_auth import (
    MerchantAuthContext, get_merchant_auth_context, require_merchant_admin
)
from app.db.deps import get_db
from app.services.security.merchant_security_policy_service import (
    MerchantSecurityPolicyService, SecurityPolicyType, SecurityRiskLevel
)
from app.services.security.enhanced_audit_service import (
    EnhancedAuditService, AuditAction, ResourceType, ComplianceStandard, AuditContext
)

logger = logging.getLogger(__name__)
router = APIRouter()


# Request/Response Models

class CreateSecurityPolicyRequest(BaseModel):
    """Request model for creating security policies."""
    policy_type: SecurityPolicyType
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    rules: Dict[str, Any]
    priority: int = Field(default=100, ge=1, le=1000)


class SecurityPolicyResponse(BaseModel):
    """Response model for security policies."""
    id: str
    tenant_id: str
    policy_type: str
    name: str
    description: Optional[str]
    rules: Dict[str, Any]
    is_active: bool
    priority: int
    created_at: datetime
    updated_at: datetime


class SecurityAssessmentResponse(BaseModel):
    """Response model for security assessments."""
    tenant_id: str
    overall_score: float
    risk_level: str
    active_threats: int
    policy_violations: int
    recommendations: List[str]
    assessment_date: datetime


class SecurityDashboardResponse(BaseModel):
    """Response model for security dashboard data."""
    tenant_id: str
    period_days: int
    total_events: int
    events_by_type: Dict[str, int]
    events_by_risk: Dict[str, int]
    active_policies: int
    security_score: float
    risk_level: str
    recent_events: List[Dict[str, Any]]
    policy_summary: List[Dict[str, Any]]


class AuditSearchRequest(BaseModel):
    """Request model for audit log search."""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    actions: Optional[List[str]] = None
    resource_types: Optional[List[str]] = None
    user_ids: Optional[List[str]] = None
    risk_levels: Optional[List[str]] = None
    success: Optional[bool] = None
    search_text: Optional[str] = None


class ComplianceReportRequest(BaseModel):
    """Request model for compliance reports."""
    compliance_standard: ComplianceStandard
    start_date: datetime
    end_date: datetime


# Security Policy Endpoints

@router.post("/policies", response_model=SecurityPolicyResponse)
async def create_security_policy(
    request: CreateSecurityPolicyRequest,
    merchant_context: MerchantAuthContext = Depends(require_merchant_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new security policy for the merchant."""
    try:
        security_service = MerchantSecurityPolicyService(db)

        policy = await security_service.create_security_policy(
            merchant_context=merchant_context,
            policy_type=request.policy_type,
            name=request.name,
            description=request.description,
            rules=request.rules,
            priority=request.priority
        )

        return SecurityPolicyResponse(
            id=policy.id,
            tenant_id=policy.tenant_id,
            policy_type=policy.policy_type.value,
            name=policy.name,
            description=policy.description,
            rules=policy.rules,
            is_active=policy.is_active,
            priority=policy.priority,
            created_at=policy.created_at,
            updated_at=policy.updated_at
        )

    except Exception as e:
        logger.error(f"Error creating security policy: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create security policy"
        )


@router.get("/policies", response_model=List[SecurityPolicyResponse])
async def list_security_policies(
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """List security policies for the merchant."""
    try:
        security_service = MerchantSecurityPolicyService(db)
        tenant_id = str(merchant_context.tenant.id)

        policies = await security_service._get_active_policies(tenant_id)

        return [
            SecurityPolicyResponse(
                id=policy.id,
                tenant_id=policy.tenant_id,
                policy_type=policy.policy_type.value,
                name=policy.name,
                description=policy.description,
                rules=policy.rules,
                is_active=policy.is_active,
                priority=policy.priority,
                created_at=policy.created_at,
                updated_at=policy.updated_at
            )
            for policy in policies
        ]

    except Exception as e:
        logger.error(f"Error listing security policies: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list security policies"
        )


@router.post("/policies/{policy_id}/evaluate")
async def evaluate_security_policy(
    policy_id: str,
    request: Request,
    operation: str = Query(..., description="Operation to evaluate"),
    resource: str = Query(..., description="Resource being accessed"),
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """Evaluate security policies for a specific operation."""
    try:
        security_service = MerchantSecurityPolicyService(db)

        # Prepare request metadata
        request_metadata = {
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "timestamp": datetime.utcnow().isoformat()
        }

        allowed, violations = await security_service.evaluate_security_policies(
            merchant_context=merchant_context,
            operation=operation,
            resource=resource,
            request_metadata=request_metadata
        )

        return {
            "allowed": allowed,
            "violations": violations,
            "policy_id": policy_id,
            "operation": operation,
            "resource": resource,
            "evaluated_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error evaluating security policy: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to evaluate security policy"
        )


# Security Assessment Endpoints

@router.get("/assessment", response_model=SecurityAssessmentResponse)
async def get_security_assessment(
    period_days: int = Query(
        30, ge=1, le=365, description="Assessment period in days"),
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """Get security assessment for the merchant."""
    try:
        security_service = MerchantSecurityPolicyService(db)

        assessment = await security_service.perform_security_assessment(
            merchant_context=merchant_context,
            assessment_period_days=period_days
        )

        return SecurityAssessmentResponse(
            tenant_id=assessment.tenant_id,
            overall_score=assessment.overall_score,
            risk_level=assessment.risk_level.value,
            active_threats=assessment.active_threats,
            policy_violations=assessment.policy_violations,
            recommendations=assessment.recommendations,
            assessment_date=assessment.assessment_date
        )

    except Exception as e:
        logger.error(f"Error getting security assessment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get security assessment"
        )


@router.get("/dashboard", response_model=SecurityDashboardResponse)
async def get_security_dashboard(
    period_days: int = Query(
        7, ge=1, le=30, description="Dashboard period in days"),
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """Get security dashboard data for the merchant."""
    try:
        security_service = MerchantSecurityPolicyService(db)

        dashboard_data = await security_service.get_security_dashboard_data(
            merchant_context=merchant_context,
            period_days=period_days
        )

        return SecurityDashboardResponse(**dashboard_data)

    except Exception as e:
        logger.error(f"Error getting security dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get security dashboard data"
        )


# Audit Log Endpoints

@router.post("/audit/search")
async def search_audit_logs(
    search_request: AuditSearchRequest,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Page size"),
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """Search audit logs for the merchant."""
    try:
        audit_service = EnhancedAuditService(db)
        tenant_id = str(merchant_context.tenant.id)

        # Convert request to filters
        filters = {
            "start_date": search_request.start_date,
            "end_date": search_request.end_date,
            "actions": search_request.actions,
            "resource_types": search_request.resource_types,
            "user_ids": search_request.user_ids,
            "risk_levels": search_request.risk_levels,
            "success": search_request.success,
            "search_text": search_request.search_text
        }

        results = await audit_service.search_audit_logs(
            tenant_id=tenant_id,
            filters=filters,
            page=page,
            page_size=page_size
        )

        return results

    except Exception as e:
        logger.error(f"Error searching audit logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search audit logs"
        )


@router.post("/audit/log")
async def log_audit_event(
    action: AuditAction,
    resource_type: ResourceType,
    request: Request,
    resource_id: Optional[str] = None,
    resource_name: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    risk_level: str = "low",
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """Log an audit event (for internal API usage)."""
    try:
        audit_service = EnhancedAuditService(db)

        # Create audit context
        context = AuditContext(
            user_id=merchant_context.user_data.user_id,
            tenant_id=str(merchant_context.tenant.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            user_email=merchant_context.user_data.email,
            user_roles=merchant_context.user_data.roles
        )

        audit_id = await audit_service.log_audit_event(
            action=action,
            resource_type=resource_type,
            context=context,
            resource_id=resource_id,
            resource_name=resource_name,
            success=success,
            error_message=error_message,
            metadata=metadata,
            risk_level=risk_level
        )

        return {
            "audit_id": audit_id,
            "logged_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error logging audit event: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to log audit event"
        )


# Compliance Endpoints

@router.post("/compliance/report")
async def generate_compliance_report(
    report_request: ComplianceReportRequest,
    merchant_context: MerchantAuthContext = Depends(require_merchant_admin),
    db: AsyncSession = Depends(get_db)
):
    """Generate compliance report for the merchant."""
    try:
        audit_service = EnhancedAuditService(db)
        tenant_id = str(merchant_context.tenant.id)

        report = await audit_service.generate_compliance_report(
            tenant_id=tenant_id,
            compliance_standard=report_request.compliance_standard,
            start_date=report_request.start_date,
            end_date=report_request.end_date
        )

        return report

    except Exception as e:
        logger.error(f"Error generating compliance report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate compliance report"
        )


@router.get("/compliance/standards")
async def list_compliance_standards():
    """List available compliance standards."""
    return {
        "standards": [
            {
                "code": standard.value,
                "name": standard.value.upper(),
                "description": f"{standard.value.upper()} compliance standard"
            }
            for standard in ComplianceStandard
        ]
    }


# Security Analytics Endpoints

@router.get("/analytics/security")
async def get_security_analytics(
    period_days: int = Query(
        30, ge=1, le=365, description="Analysis period in days"),
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """Get security analytics for the merchant."""
    try:
        audit_service = EnhancedAuditService(db)
        tenant_id = str(merchant_context.tenant.id)

        analysis = await audit_service.perform_security_analysis(
            tenant_id=tenant_id,
            analysis_period_days=period_days
        )

        return {
            "tenant_id": analysis.tenant_id,
            "analysis_period": analysis.analysis_period,
            "total_events": analysis.total_events,
            "high_risk_events": analysis.high_risk_events,
            "failed_operations": analysis.failed_operations,
            "unusual_patterns": analysis.unusual_patterns,
            "compliance_issues": analysis.compliance_issues,
            "recommendations": analysis.recommendations,
            "threat_indicators": analysis.threat_indicators,
            "analysis_timestamp": analysis.analysis_timestamp.isoformat()
        }

    except Exception as e:
        logger.error(f"Error getting security analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get security analytics"
        )


@router.get("/health")
async def security_health_check():
    """Health check endpoint for security services."""
    return {
        "status": "healthy",
        "service": "merchant_security",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
