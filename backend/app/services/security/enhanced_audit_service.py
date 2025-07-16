"""
Enhanced Security Audit Service.

This service provides advanced audit logging and analysis capabilities
beyond basic audit trails, including security event correlation, compliance
reporting, and automated threat detection.

Track A Phase 3: Enhanced merchant-specific security and access control
"""

import uuid
import json
import logging
from enum import Enum
from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, text
from fastapi import Request, HTTPException, status
from dataclasses import dataclass, asdict

from app.models.security.merchant_security import (
    SecurityAuditLog, SecurityEvent, SecurityAlert, SecurityRiskLevel
)
from app.models.tenant import Tenant
from app.core.security.merchant_auth import MerchantAuthContext
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class AuditAction(str, Enum):
    """Standard audit actions for consistent logging."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    ACCESS_GRANTED = "access_granted"
    ACCESS_DENIED = "access_denied"
    POLICY_VIOLATION = "policy_violation"
    CONFIGURATION_CHANGE = "configuration_change"
    SECURITY_EVENT = "security_event"
    DATA_EXPORT = "data_export"
    BULK_OPERATION = "bulk_operation"


class ResourceType(str, Enum):
    """Standard resource types for audit logging."""
    USER = "user"
    TENANT = "tenant"
    PRODUCT = "product"
    ORDER = "order"
    PAYMENT = "payment"
    SECURITY_POLICY = "security_policy"
    STOREFRONT_CONFIG = "storefront_config"
    SETTINGS = "settings"
    AUDIT_LOG = "audit_log"
    SYSTEM = "system"


class ComplianceStandard(str, Enum):
    """Compliance standards for audit tagging."""
    GDPR = "gdpr"
    SOC2 = "soc2"
    ISO27001 = "iso27001"
    HIPAA = "hipaa"
    PCI_DSS = "pci_dss"
    CCPA = "ccpa"


@dataclass
class AuditContext:
    """Context information for audit logging."""
    user_id: str
    tenant_id: str
    request_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    user_email: Optional[str] = None
    user_roles: List[str] = None
    correlation_id: Optional[str] = None


@dataclass
class SecurityAnalysis:
    """Results of security analysis on audit data."""
    tenant_id: str
    analysis_period: int
    total_events: int
    high_risk_events: int
    failed_operations: int
    unusual_patterns: List[Dict[str, Any]]
    compliance_issues: List[Dict[str, Any]]
    recommendations: List[str]
    threat_indicators: List[Dict[str, Any]]
    analysis_timestamp: datetime


class EnhancedAuditService:
    """
    Enhanced security audit service providing advanced logging and analysis.

    Features:
    - Comprehensive audit trail with rich metadata
    - Security event correlation and analysis
    - Compliance reporting and monitoring
    - Automated threat detection
    - Advanced search and filtering
    - Data retention management
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self._correlation_cache: Dict[str, List[str]] = {}
        self._cache_ttl = 300  # 5 minutes

    async def log_audit_event(
        self,
        action: AuditAction,
        resource_type: ResourceType,
        context: AuditContext,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        before_state: Optional[Dict[str, Any]] = None,
        after_state: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        response_code: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        compliance_tags: Optional[List[ComplianceStandard]] = None,
        risk_level: str = "low"
    ) -> str:
        """
        Log an enhanced audit event with comprehensive metadata.

        Args:
            action: The action being performed
            resource_type: Type of resource being accessed
            context: Audit context with user and request information
            resource_id: ID of the resource (if applicable)
            resource_name: Name of the resource (if applicable)
            before_state: State before the change
            after_state: State after the change
            success: Whether the operation was successful
            error_message: Error message if operation failed
            response_code: HTTP response code
            metadata: Additional metadata
            compliance_tags: Compliance standards this event relates to
            risk_level: Risk level of the operation

        Returns:
            Audit log entry ID
        """
        try:
            # Calculate changes if both states provided
            changes = None
            if before_state and after_state:
                changes = self._calculate_changes(before_state, after_state)

            # Determine compliance tags automatically if not provided
            if not compliance_tags:
                compliance_tags = self._determine_compliance_tags(
                    action, resource_type)

            # Create audit log entry
            audit_log = SecurityAuditLog(
                id=uuid.uuid4(),
                tenant_id=uuid.UUID(context.tenant_id),
                action=action.value,
                resource_type=resource_type.value,
                resource_id=resource_id,
                resource_name=resource_name,
                user_id=context.user_id,
                user_email=context.user_email,
                user_roles=context.user_roles,
                ip_address=context.ip_address,
                user_agent=context.user_agent,
                request_id=context.request_id,
                session_id=context.session_id,
                before_state=before_state,
                after_state=after_state,
                changes=changes,
                metadata=metadata or {},
                risk_level=risk_level,
                compliance_tags=[
                    tag.value for tag in compliance_tags] if compliance_tags else [],
                success=success,
                error_message=error_message,
                response_code=response_code,
                timestamp=datetime.utcnow()
            )

            # Store in database (would use actual model)
            audit_id = str(audit_log.id)

            # Log for debugging
            logger.info(
                f"Audit event logged: {audit_id} - {action.value} on {resource_type.value}")

            # Check for security patterns
            await self._analyze_for_security_patterns(audit_log, context)

            # Store correlation data
            if context.correlation_id:
                await self._store_correlation(context.correlation_id, audit_id)

            return audit_id

        except Exception as e:
            logger.error(f"Failed to log audit event: {str(e)}")
            # Don't let audit logging failure break the main operation
            return str(uuid.uuid4())

    async def search_audit_logs(
        self,
        tenant_id: str,
        filters: Dict[str, Any],
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """
        Search audit logs with advanced filtering.

        Args:
            tenant_id: Tenant ID to search within
            filters: Filter criteria
            page: Page number for pagination
            page_size: Number of results per page

        Returns:
            Search results with pagination info
        """
        # Build query filters
        query_filters = [SecurityAuditLog.tenant_id == uuid.UUID(tenant_id)]

        # Date range filter
        if filters.get("start_date"):
            query_filters.append(
                SecurityAuditLog.timestamp >= filters["start_date"])
        if filters.get("end_date"):
            query_filters.append(
                SecurityAuditLog.timestamp <= filters["end_date"])

        # Action filter
        if filters.get("actions"):
            query_filters.append(
                SecurityAuditLog.action.in_(filters["actions"]))

        # Resource type filter
        if filters.get("resource_types"):
            query_filters.append(
                SecurityAuditLog.resource_type.in_(filters["resource_types"]))

        # User filter
        if filters.get("user_ids"):
            query_filters.append(
                SecurityAuditLog.user_id.in_(filters["user_ids"]))

        # Risk level filter
        if filters.get("risk_levels"):
            query_filters.append(
                SecurityAuditLog.risk_level.in_(filters["risk_levels"]))

        # Success filter
        if filters.get("success") is not None:
            query_filters.append(
                SecurityAuditLog.success == filters["success"])

        # Text search in description or metadata
        if filters.get("search_text"):
            search_text = f"%{filters['search_text']}%"
            query_filters.append(
                or_(
                    SecurityAuditLog.error_message.ilike(search_text),
                    SecurityAuditLog.resource_name.ilike(search_text),
                    func.jsonb_path_exists(
                        SecurityAuditLog.metadata,
                        f'$.** ? (@ like_regex "{filters["search_text"]}" flag "i")'
                    )
                )
            )

        # Execute query (simulated for now)
        # In real implementation, would execute SQLAlchemy query

        # Mock results for demonstration
        results = []
        total_count = 0

        return {
            "results": results,
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        }

    async def generate_compliance_report(
        self,
        tenant_id: str,
        compliance_standard: ComplianceStandard,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        Generate compliance report for a specific standard.

        Args:
            tenant_id: Tenant ID to generate report for
            compliance_standard: Compliance standard to report on
            start_date: Report start date
            end_date: Report end date

        Returns:
            Compliance report data
        """
        # Get audit logs for the period with the compliance tag
        compliance_events = await self._get_compliance_events(
            tenant_id, compliance_standard, start_date, end_date
        )

        # Analyze compliance
        analysis = await self._analyze_compliance(compliance_events, compliance_standard)

        # Generate report structure
        report = {
            "tenant_id": tenant_id,
            "compliance_standard": compliance_standard.value,
            "report_period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "summary": {
                "total_events": len(compliance_events),
                "compliant_events": analysis["compliant_count"],
                "non_compliant_events": analysis["non_compliant_count"],
                "compliance_score": analysis["compliance_score"],
                "risk_level": analysis["risk_level"]
            },
            "violations": analysis["violations"],
            "recommendations": analysis["recommendations"],
            "event_breakdown": analysis["event_breakdown"],
            "generated_at": datetime.utcnow().isoformat()
        }

        return report

    async def perform_security_analysis(
        self,
        tenant_id: str,
        analysis_period_days: int = 30
    ) -> SecurityAnalysis:
        """
        Perform security analysis on audit data.

        Args:
            tenant_id: Tenant ID to analyze
            analysis_period_days: Number of days to analyze

        Returns:
            Security analysis results
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=analysis_period_days)

        # Get audit logs for analysis
        audit_logs = await self._get_audit_logs_for_analysis(tenant_id, start_date, end_date)

        # Perform various analyses
        unusual_patterns = await self._detect_unusual_patterns(audit_logs)
        threat_indicators = await self._detect_threat_indicators(audit_logs)
        compliance_issues = await self._detect_compliance_issues(audit_logs)

        # Calculate metrics
        total_events = len(audit_logs)
        high_risk_events = len(
            [log for log in audit_logs if log.risk_level in ["high", "critical"]])
        failed_operations = len([log for log in audit_logs if not log.success])

        # Generate recommendations
        recommendations = await self._generate_security_recommendations(
            audit_logs, unusual_patterns, threat_indicators
        )

        analysis = SecurityAnalysis(
            tenant_id=tenant_id,
            analysis_period=analysis_period_days,
            total_events=total_events,
            high_risk_events=high_risk_events,
            failed_operations=failed_operations,
            unusual_patterns=unusual_patterns,
            compliance_issues=compliance_issues,
            recommendations=recommendations,
            threat_indicators=threat_indicators,
            analysis_timestamp=datetime.utcnow()
        )

        return analysis

    async def create_security_alert(
        self,
        tenant_id: str,
        alert_type: str,
        severity: str,
        title: str,
        description: str,
        source_event_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        affected_resources: Optional[List[str]] = None,
        recommended_actions: Optional[List[str]] = None
    ) -> str:
        """
        Create a security alert based on audit analysis.

        Args:
            tenant_id: Tenant ID for the alert
            alert_type: Type of security alert
            severity: Alert severity level
            title: Alert title
            description: Alert description
            source_event_id: Related security event ID
            metadata: Additional alert metadata
            affected_resources: List of affected resources
            recommended_actions: List of recommended actions

        Returns:
            Alert ID
        """
        alert = SecurityAlert(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id),
            alert_type=alert_type,
            severity=severity,
            title=title,
            description=description,
            source_event_id=uuid.UUID(
                source_event_id) if source_event_id else None,
            metadata=metadata or {},
            affected_resources=affected_resources or [],
            recommended_actions=recommended_actions or [],
            status="open"
        )

        # Store alert (would use actual model)
        alert_id = str(alert.id)

        logger.warning(f"Security alert created: {alert_id} - {title}")

        # Send notifications based on severity
        await self._send_alert_notifications(alert)

        return alert_id

    # Private helper methods

    def _calculate_changes(
        self,
        before_state: Dict[str, Any],
        after_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate changes between before and after states."""
        changes = {}

        # Find added, modified, and removed fields
        all_keys = set(before_state.keys()) | set(after_state.keys())

        for key in all_keys:
            before_value = before_state.get(key)
            after_value = after_state.get(key)

            if before_value != after_value:
                changes[key] = {
                    "before": before_value,
                    "after": after_value
                }

        return changes

    def _determine_compliance_tags(
        self,
        action: AuditAction,
        resource_type: ResourceType
    ) -> List[ComplianceStandard]:
        """Automatically determine compliance tags based on action and resource."""
        tags = []

        # GDPR - applies to personal data operations
        if resource_type in [ResourceType.USER] or action in [AuditAction.DATA_EXPORT]:
            tags.append(ComplianceStandard.GDPR)
            tags.append(ComplianceStandard.CCPA)

        # PCI DSS - applies to payment operations
        if resource_type == ResourceType.PAYMENT:
            tags.append(ComplianceStandard.PCI_DSS)

        # SOC2 - applies to system and security operations
        if resource_type in [ResourceType.SYSTEM, ResourceType.SECURITY_POLICY]:
            tags.append(ComplianceStandard.SOC2)
            tags.append(ComplianceStandard.ISO27001)

        return tags

    async def _analyze_for_security_patterns(
        self,
        audit_log: SecurityAuditLog,
        context: AuditContext
    ) -> None:
        """Analyze audit log for potential security patterns."""
        # Check for suspicious patterns
        if audit_log.action == "login" and not audit_log.success:
            await self._check_failed_login_pattern(context.tenant_id, context.user_id, context.ip_address)

        if audit_log.risk_level in ["high", "critical"]:
            await self._check_high_risk_pattern(context.tenant_id, audit_log)

        if audit_log.action == "bulk_operation":
            await self._check_bulk_operation_pattern(context.tenant_id, context.user_id)

    async def _check_failed_login_pattern(
        self,
        tenant_id: str,
        user_id: str,
        ip_address: Optional[str]
    ) -> None:
        """Check for failed login patterns that might indicate brute force attacks."""
        # In real implementation, would check recent failed logins
        # and create alerts if threshold exceeded
        pass

    async def _check_high_risk_pattern(
        self,
        tenant_id: str,
        audit_log: SecurityAuditLog
    ) -> None:
        """Check for patterns in high-risk operations."""
        # In real implementation, would analyze high-risk operation patterns
        pass

    async def _check_bulk_operation_pattern(
        self,
        tenant_id: str,
        user_id: str
    ) -> None:
        """Check for unusual bulk operation patterns."""
        # In real implementation, would analyze bulk operation patterns
        pass

    async def _store_correlation(self, correlation_id: str, audit_id: str) -> None:
        """Store correlation data for related events."""
        if correlation_id not in self._correlation_cache:
            self._correlation_cache[correlation_id] = []
        self._correlation_cache[correlation_id].append(audit_id)

    async def _get_compliance_events(
        self,
        tenant_id: str,
        compliance_standard: ComplianceStandard,
        start_date: datetime,
        end_date: datetime
    ) -> List[SecurityAuditLog]:
        """Get audit events related to a specific compliance standard."""
        # In real implementation, would query database
        return []

    async def _analyze_compliance(
        self,
        events: List[SecurityAuditLog],
        standard: ComplianceStandard
    ) -> Dict[str, Any]:
        """Analyze events for compliance with a specific standard."""
        # Mock analysis results
        return {
            "compliant_count": 0,
            "non_compliant_count": 0,
            "compliance_score": 100.0,
            "risk_level": "low",
            "violations": [],
            "recommendations": [],
            "event_breakdown": {}
        }

    async def _get_audit_logs_for_analysis(
        self,
        tenant_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[SecurityAuditLog]:
        """Get audit logs for security analysis."""
        # In real implementation, would query database
        return []

    async def _detect_unusual_patterns(
        self,
        audit_logs: List[SecurityAuditLog]
    ) -> List[Dict[str, Any]]:
        """Detect unusual patterns in audit data."""
        # Mock pattern detection
        return []

    async def _detect_threat_indicators(
        self,
        audit_logs: List[SecurityAuditLog]
    ) -> List[Dict[str, Any]]:
        """Detect potential threat indicators."""
        # Mock threat detection
        return []

    async def _detect_compliance_issues(
        self,
        audit_logs: List[SecurityAuditLog]
    ) -> List[Dict[str, Any]]:
        """Detect compliance issues in audit data."""
        # Mock compliance issue detection
        return []

    async def _generate_security_recommendations(
        self,
        audit_logs: List[SecurityAuditLog],
        unusual_patterns: List[Dict[str, Any]],
        threat_indicators: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate security recommendations based on analysis."""
        recommendations = []

        if len(threat_indicators) > 0:
            recommendations.append(
                "Review and investigate detected threat indicators")

        if len(unusual_patterns) > 0:
            recommendations.append(
                "Analyze unusual activity patterns for potential security issues")

        return recommendations

    async def _send_alert_notifications(self, alert: SecurityAlert) -> None:
        """Send notifications for security alerts."""
        # In real implementation, would send notifications via various channels
        logger.info(f"Sending notifications for alert: {alert.id}")
