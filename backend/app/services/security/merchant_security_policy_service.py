"""
Enhanced Merchant Security Policy Service.

This service provides advanced security policies and enforcement for merchants
beyond the basic RLS implementation, including custom security rules, advanced
threat detection, and merchant-specific security configurations.

Track A Phase 3: Enhanced merchant-specific security and access control
"""

import uuid
import json
import logging
from enum import Enum
from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from fastapi import HTTPException, status
from dataclasses import dataclass

from app.models.tenant import Tenant
from app.models.user import User
from app.core.exceptions import ValidationError, AuthorizationError
from app.core.security.merchant_auth import MerchantAuthContext

logger = logging.getLogger(__name__)


class SecurityPolicyType(str, Enum):
    """Types of security policies that can be applied."""
    ACCESS_CONTROL = "access_control"
    RATE_LIMITING = "rate_limiting"
    IP_RESTRICTION = "ip_restriction"
    TIME_RESTRICTION = "time_restriction"
    DATA_ACCESS = "data_access"
    OPERATION_RESTRICTION = "operation_restriction"
    COMPLIANCE = "compliance"


class SecurityRiskLevel(str, Enum):
    """Security risk levels for threat assessment."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SecurityPolicy:
    """Data class for security policy definition."""
    id: str
    tenant_id: str
    policy_type: SecurityPolicyType
    name: str
    description: str
    rules: Dict[str, Any]
    is_active: bool
    priority: int
    created_at: datetime
    updated_at: datetime


@dataclass
class SecurityEvent:
    """Data class for security event tracking."""
    id: str
    tenant_id: str
    event_type: str
    risk_level: SecurityRiskLevel
    description: str
    metadata: Dict[str, Any]
    user_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = None
    resolved: bool = False


@dataclass
class SecurityAssessment:
    """Data class for security assessment results."""
    tenant_id: str
    overall_score: float
    risk_level: SecurityRiskLevel
    active_threats: int
    policy_violations: int
    recommendations: List[str]
    assessment_date: datetime


class MerchantSecurityPolicyService:
    """
    Enhanced security policy service for merchant-specific security management.

    Provides advanced security features including:
    - Custom security policy creation and enforcement
    - Real-time threat detection and analysis
    - Advanced audit logging with security analytics
    - Merchant-specific security assessments
    - Compliance monitoring and reporting
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self._policy_cache: Dict[str, List[SecurityPolicy]] = {}
        self._cache_ttl = 300  # 5 minutes

    async def create_security_policy(
        self,
        merchant_context: MerchantAuthContext,
        policy_type: SecurityPolicyType,
        name: str,
        description: str,
        rules: Dict[str, Any],
        priority: int = 100
    ) -> SecurityPolicy:
        """
        Create a new security policy for a merchant.

        Args:
            merchant_context: Merchant authentication context
            policy_type: Type of security policy
            name: Policy name
            description: Policy description
            rules: Policy rules and configuration
            priority: Policy priority (lower = higher priority)

        Returns:
            Created SecurityPolicy
        """
        # Validate merchant has permission to create policies
        if not merchant_context.is_merchant_owner and not merchant_context.user_data.is_admin():
            raise AuthorizationError(
                "Insufficient permissions to create security policies")

        # Validate policy rules
        self._validate_policy_rules(policy_type, rules)

        policy = SecurityPolicy(
            id=str(uuid.uuid4()),
            tenant_id=str(merchant_context.tenant.id),
            policy_type=policy_type,
            name=name,
            description=description,
            rules=rules,
            is_active=True,
            priority=priority,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        # Store policy in database (would use actual PolicyModel)
        await self._store_security_policy(policy)

        # Clear policy cache for this tenant
        self._clear_policy_cache(str(merchant_context.tenant.id))

        # Log policy creation
        await self._log_security_event(
            tenant_id=str(merchant_context.tenant.id),
            event_type="policy_created",
            risk_level=SecurityRiskLevel.LOW,
            description=f"Security policy '{name}' created",
            metadata={
                "policy_id": policy.id,
                "policy_type": policy_type.value,
                "created_by": merchant_context.user_data.user_id
            },
            user_id=merchant_context.user_data.user_id
        )

        return policy

    async def evaluate_security_policies(
        self,
        merchant_context: MerchantAuthContext,
        operation: str,
        resource: str,
        request_metadata: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """
        Evaluate security policies for a specific operation.

        Args:
            merchant_context: Merchant authentication context
            operation: Operation being performed
            resource: Resource being accessed
            request_metadata: Request metadata (IP, user agent, etc.)

        Returns:
            Tuple of (allowed: bool, violations: List[str])
        """
        tenant_id = str(merchant_context.tenant.id)
        policies = await self._get_active_policies(tenant_id)

        violations = []
        allowed = True

        for policy in sorted(policies, key=lambda p: p.priority):
            try:
                policy_result = await self._evaluate_single_policy(
                    policy, merchant_context, operation, resource, request_metadata
                )

                if not policy_result["allowed"]:
                    allowed = False
                    violations.extend(policy_result["violations"])

                    # Log policy violation
                    await self._log_security_event(
                        tenant_id=tenant_id,
                        event_type="policy_violation",
                        risk_level=SecurityRiskLevel.MEDIUM,
                        description=f"Security policy violation: {policy.name}",
                        metadata={
                            "policy_id": policy.id,
                            "policy_name": policy.name,
                            "operation": operation,
                            "resource": resource,
                            "violations": policy_result["violations"]
                        },
                        user_id=merchant_context.user_data.user_id,
                        ip_address=request_metadata.get("ip_address"),
                        user_agent=request_metadata.get("user_agent")
                    )

            except Exception as e:
                logger.error(f"Error evaluating policy {policy.id}: {str(e)}")
                # Fail secure - deny access on policy evaluation error
                allowed = False
                violations.append(f"Policy evaluation error: {policy.name}")

        return allowed, violations

    async def perform_security_assessment(
        self,
        merchant_context: MerchantAuthContext,
        assessment_period_days: int = 30
    ) -> SecurityAssessment:
        """
        Perform comprehensive security assessment for a merchant.

        Args:
            merchant_context: Merchant authentication context
            assessment_period_days: Number of days to analyze

        Returns:
            SecurityAssessment with scores and recommendations
        """
        tenant_id = str(merchant_context.tenant.id)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=assessment_period_days)

        # Get security events in period
        security_events = await self._get_security_events(tenant_id, start_date, end_date)

        # Calculate security metrics
        total_events = len(security_events)
        critical_events = len(
            [e for e in security_events if e.risk_level == SecurityRiskLevel.CRITICAL])
        high_events = len(
            [e for e in security_events if e.risk_level == SecurityRiskLevel.HIGH])
        unresolved_events = len([e for e in security_events if not e.resolved])

        # Calculate overall security score (0-100)
        base_score = 100.0
        score_deductions = 0.0

        # Deduct points for security events
        score_deductions += critical_events * 20.0  # 20 points per critical event
        score_deductions += high_events * 10.0      # 10 points per high event
        score_deductions += unresolved_events * 5.0  # 5 points per unresolved event

        overall_score = max(0.0, base_score - score_deductions)

        # Determine risk level
        if overall_score >= 90:
            risk_level = SecurityRiskLevel.LOW
        elif overall_score >= 70:
            risk_level = SecurityRiskLevel.MEDIUM
        elif overall_score >= 50:
            risk_level = SecurityRiskLevel.HIGH
        else:
            risk_level = SecurityRiskLevel.CRITICAL

        # Generate recommendations
        recommendations = await self._generate_security_recommendations(
            security_events, overall_score, risk_level
        )

        assessment = SecurityAssessment(
            tenant_id=tenant_id,
            overall_score=overall_score,
            risk_level=risk_level,
            active_threats=unresolved_events,
            policy_violations=len(
                [e for e in security_events if e.event_type == "policy_violation"]),
            recommendations=recommendations,
            assessment_date=datetime.utcnow()
        )

        # Store assessment results
        await self._store_security_assessment(assessment)

        return assessment

    async def get_security_dashboard_data(
        self,
        merchant_context: MerchantAuthContext,
        period_days: int = 7
    ) -> Dict[str, Any]:
        """
        Get security dashboard data for merchant monitoring.

        Args:
            merchant_context: Merchant authentication context
            period_days: Number of days for dashboard data

        Returns:
            Dictionary containing dashboard metrics and data
        """
        tenant_id = str(merchant_context.tenant.id)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)

        # Get recent security events
        security_events = await self._get_security_events(tenant_id, start_date, end_date)

        # Get active policies
        active_policies = await self._get_active_policies(tenant_id)

        # Calculate metrics
        events_by_type = {}
        events_by_risk = {level.value: 0 for level in SecurityRiskLevel}

        for event in security_events:
            events_by_type[event.event_type] = events_by_type.get(
                event.event_type, 0) + 1
            events_by_risk[event.risk_level.value] += 1

        # Get latest security assessment
        latest_assessment = await self._get_latest_security_assessment(tenant_id)

        return {
            "tenant_id": tenant_id,
            "period_days": period_days,
            "total_events": len(security_events),
            "events_by_type": events_by_type,
            "events_by_risk": events_by_risk,
            "active_policies": len(active_policies),
            "security_score": latest_assessment.overall_score if latest_assessment else 0.0,
            "risk_level": latest_assessment.risk_level.value if latest_assessment else "unknown",
            "recent_events": [
                {
                    "id": event.id,
                    "type": event.event_type,
                    "risk_level": event.risk_level.value,
                    "description": event.description,
                    "timestamp": event.timestamp.isoformat(),
                    "resolved": event.resolved
                }
                for event in security_events[-10:]  # Last 10 events
            ],
            "policy_summary": [
                {
                    "id": policy.id,
                    "name": policy.name,
                    "type": policy.policy_type.value,
                    "is_active": policy.is_active,
                    "priority": policy.priority
                }
                for policy in active_policies
            ]
        }

    # Private helper methods

    def _validate_policy_rules(self, policy_type: SecurityPolicyType, rules: Dict[str, Any]) -> None:
        """Validate policy rules based on policy type."""
        required_fields = {
            SecurityPolicyType.ACCESS_CONTROL: ["resources", "permissions"],
            SecurityPolicyType.RATE_LIMITING: ["max_requests", "time_window"],
            SecurityPolicyType.IP_RESTRICTION: ["allowed_ips", "denied_ips"],
            SecurityPolicyType.TIME_RESTRICTION: ["allowed_hours", "timezone"],
            SecurityPolicyType.DATA_ACCESS: ["data_types", "access_levels"],
            SecurityPolicyType.OPERATION_RESTRICTION: ["operations", "restrictions"],
            SecurityPolicyType.COMPLIANCE: ["standards", "requirements"]
        }

        required = required_fields.get(policy_type, [])
        for field in required:
            if field not in rules:
                raise ValidationError(
                    f"Missing required field '{field}' for policy type {policy_type.value}")

    async def _store_security_policy(self, policy: SecurityPolicy) -> None:
        """Store security policy in database."""
        # In real implementation, this would use a PolicyModel
        # For now, we'll simulate storage
        logger.info(
            f"Storing security policy: {policy.id} for tenant: {policy.tenant_id}")

    async def _get_active_policies(self, tenant_id: str) -> List[SecurityPolicy]:
        """Get active security policies for a tenant."""
        # Check cache first
        if tenant_id in self._policy_cache:
            return self._policy_cache[tenant_id]

        # In real implementation, query from database
        # For now, return empty list
        policies = []

        # Cache the results
        self._policy_cache[tenant_id] = policies
        return policies

    def _clear_policy_cache(self, tenant_id: str) -> None:
        """Clear policy cache for a tenant."""
        if tenant_id in self._policy_cache:
            del self._policy_cache[tenant_id]

    async def _evaluate_single_policy(
        self,
        policy: SecurityPolicy,
        merchant_context: MerchantAuthContext,
        operation: str,
        resource: str,
        request_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate a single security policy."""
        violations = []
        allowed = True

        # Policy-specific evaluation logic
        if policy.policy_type == SecurityPolicyType.ACCESS_CONTROL:
            allowed, policy_violations = self._evaluate_access_control_policy(
                policy, merchant_context, operation, resource
            )
            violations.extend(policy_violations)

        elif policy.policy_type == SecurityPolicyType.RATE_LIMITING:
            allowed, policy_violations = await self._evaluate_rate_limiting_policy(
                policy, merchant_context, request_metadata
            )
            violations.extend(policy_violations)

        elif policy.policy_type == SecurityPolicyType.IP_RESTRICTION:
            allowed, policy_violations = self._evaluate_ip_restriction_policy(
                policy, request_metadata
            )
            violations.extend(policy_violations)

        elif policy.policy_type == SecurityPolicyType.TIME_RESTRICTION:
            allowed, policy_violations = self._evaluate_time_restriction_policy(
                policy, request_metadata
            )
            violations.extend(policy_violations)

        return {
            "allowed": allowed,
            "violations": violations
        }

    def _evaluate_access_control_policy(
        self,
        policy: SecurityPolicy,
        merchant_context: MerchantAuthContext,
        operation: str,
        resource: str
    ) -> Tuple[bool, List[str]]:
        """Evaluate access control policy."""
        rules = policy.rules
        violations = []

        # Check if resource is covered by policy
        if resource not in rules.get("resources", []):
            return True, []  # Policy doesn't apply to this resource

        # Check if user has required permissions
        required_permissions = rules.get("permissions", {}).get(operation, [])
        user_roles = merchant_context.user_data.roles

        has_permission = False
        for permission in required_permissions:
            if permission in user_roles:
                has_permission = True
                break

        if not has_permission:
            violations.append(
                f"Insufficient permissions for {operation} on {resource}")

        return has_permission, violations

    async def _evaluate_rate_limiting_policy(
        self,
        policy: SecurityPolicy,
        merchant_context: MerchantAuthContext,
        request_metadata: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Evaluate rate limiting policy."""
        # Simplified rate limiting check
        # In real implementation, would use Redis or similar
        return True, []

    def _evaluate_ip_restriction_policy(
        self,
        policy: SecurityPolicy,
        request_metadata: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Evaluate IP restriction policy."""
        rules = policy.rules
        client_ip = request_metadata.get("ip_address")

        if not client_ip:
            return True, []  # No IP to check

        allowed_ips = rules.get("allowed_ips", [])
        denied_ips = rules.get("denied_ips", [])
        violations = []

        # Check denied IPs first
        if client_ip in denied_ips:
            violations.append(f"IP {client_ip} is explicitly denied")
            return False, violations

        # Check allowed IPs if specified
        if allowed_ips and client_ip not in allowed_ips:
            violations.append(f"IP {client_ip} is not in allowed list")
            return False, violations

        return True, []

    def _evaluate_time_restriction_policy(
        self,
        policy: SecurityPolicy,
        request_metadata: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Evaluate time restriction policy."""
        rules = policy.rules
        current_hour = datetime.utcnow().hour
        allowed_hours = rules.get("allowed_hours", list(range(24)))
        violations = []

        if current_hour not in allowed_hours:
            violations.append(f"Access not allowed at hour {current_hour}")
            return False, violations

        return True, []

    async def _log_security_event(
        self,
        tenant_id: str,
        event_type: str,
        risk_level: SecurityRiskLevel,
        description: str,
        metadata: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Log a security event."""
        event = SecurityEvent(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            event_type=event_type,
            risk_level=risk_level,
            description=description,
            metadata=metadata,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            timestamp=datetime.utcnow(),
            resolved=False
        )

        # Store in database (would use actual SecurityEventModel)
        logger.info(f"Security event logged: {event.id} - {event.description}")

    async def _get_security_events(
        self,
        tenant_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[SecurityEvent]:
        """Get security events for a tenant within date range."""
        # In real implementation, query from database
        return []

    async def _store_security_assessment(self, assessment: SecurityAssessment) -> None:
        """Store security assessment results."""
        # In real implementation, store in database
        logger.info(
            f"Security assessment stored for tenant: {assessment.tenant_id}")

    async def _get_latest_security_assessment(self, tenant_id: str) -> Optional[SecurityAssessment]:
        """Get latest security assessment for a tenant."""
        # In real implementation, query from database
        return None

    async def _generate_security_recommendations(
        self,
        security_events: List[SecurityEvent],
        overall_score: float,
        risk_level: SecurityRiskLevel
    ) -> List[str]:
        """Generate security recommendations based on events and score."""
        recommendations = []

        if overall_score < 70:
            recommendations.append(
                "Enable two-factor authentication for all admin users")
            recommendations.append("Review and update access control policies")

        if risk_level in [SecurityRiskLevel.HIGH, SecurityRiskLevel.CRITICAL]:
            recommendations.append("Conduct immediate security audit")
            recommendations.append("Enable advanced monitoring and alerting")

        # Check for specific event patterns
        policy_violations = len(
            [e for e in security_events if e.event_type == "policy_violation"])
        if policy_violations > 10:
            recommendations.append("Review security policy configurations")

        failed_logins = len(
            [e for e in security_events if e.event_type == "failed_login"])
        if failed_logins > 20:
            recommendations.append(
                "Implement IP blocking for repeated failed logins")

        return recommendations
