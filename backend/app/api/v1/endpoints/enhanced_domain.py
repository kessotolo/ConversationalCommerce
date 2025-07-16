"""
API endpoints for enhanced domain management features.

Track A Phase 3: Enhanced custom domain support with SSL automation
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, validator

from app.core.security.merchant_auth import (
    MerchantAuthContext, get_merchant_auth_context, require_merchant_admin
)
from app.db.deps import get_db
from app.services.domain.enhanced_domain_service import (
    EnhancedDomainService, DomainStatus, SSLProvider
)

logger = logging.getLogger(__name__)
router = APIRouter()


# Request/Response Models

class CreateCustomDomainRequest(BaseModel):
    """Request model for creating custom domains."""
    domain: str = Field(..., min_length=3, max_length=253)
    enable_ssl: bool = Field(default=True)
    ssl_provider: SSLProvider = Field(default=SSLProvider.LETS_ENCRYPT)
    auto_renew: bool = Field(default=True)

    @validator('domain')
    def validate_domain(cls, v):
        import re
        pattern = r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid domain format')
        return v.lower()


class DomainConfigResponse(BaseModel):
    """Response model for domain configuration."""
    domain: str
    tenant_id: str
    status: str
    verification_token: str
    ssl_enabled: bool
    ssl_provider: Optional[str]
    auto_renew: bool
    created_at: str
    verification_instructions: Dict[str, Any]


class DomainVerificationResponse(BaseModel):
    """Response model for domain verification."""
    domain: str
    verified: bool
    checks: Dict[str, bool]
    verified_at: Optional[str]
    next_steps: List[str]
    error: Optional[str] = None


class DomainHealthResponse(BaseModel):
    """Response model for domain health."""
    domain: str
    is_healthy: bool
    response_time_ms: float
    ssl_valid: bool
    ssl_expires_at: Optional[str]
    dns_resolves: bool
    http_status: Optional[int]
    last_checked: str
    issues: List[str]


class SSLCertificateResponse(BaseModel):
    """Response model for SSL certificates."""
    domain: str
    provider: str
    issued_at: str
    expires_at: str
    is_valid: bool
    auto_renew: bool


class DomainAnalyticsResponse(BaseModel):
    """Response model for domain analytics."""
    domain: str
    period_start: str
    period_end: str
    total_requests: int
    unique_visitors: int
    response_time_avg: float
    response_time_p95: float
    error_rate: float
    ssl_issues: int
    uptime_percentage: float
    bandwidth_mb: float


# Domain Management Endpoints

@router.post("/domains", response_model=DomainConfigResponse)
async def create_custom_domain(
    request: CreateCustomDomainRequest,
    merchant_context: MerchantAuthContext = Depends(require_merchant_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a custom domain for the merchant."""
    try:
        domain_service = EnhancedDomainService(db)

        domain_config = await domain_service.create_custom_domain(
            merchant_context=merchant_context,
            domain=request.domain,
            enable_ssl=request.enable_ssl,
            ssl_provider=request.ssl_provider,
            auto_renew=request.auto_renew
        )

        return DomainConfigResponse(**domain_config)

    except Exception as e:
        logger.error(f"Error creating custom domain: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create custom domain"
        )


@router.post("/domains/{domain}/verify", response_model=DomainVerificationResponse)
async def verify_domain(
    domain: str,
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """Verify domain ownership and DNS configuration."""
    try:
        domain_service = EnhancedDomainService(db)
        tenant_id = str(merchant_context.tenant.id)

        verification_result = await domain_service.verify_domain(domain, tenant_id)

        return DomainVerificationResponse(**verification_result)

    except Exception as e:
        logger.error(f"Error verifying domain: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify domain"
        )


@router.get("/domains/{domain}/health", response_model=DomainHealthResponse)
async def check_domain_health(
    domain: str,
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """Check domain health status."""
    try:
        domain_service = EnhancedDomainService(db)

        health = await domain_service.check_domain_health(domain)

        return DomainHealthResponse(
            domain=health.domain,
            is_healthy=health.is_healthy,
            response_time_ms=health.response_time_ms,
            ssl_valid=health.ssl_valid,
            ssl_expires_at=health.ssl_expires_at.isoformat() if health.ssl_expires_at else None,
            dns_resolves=health.dns_resolves,
            http_status=health.http_status,
            last_checked=health.last_checked.isoformat(),
            issues=health.issues
        )

    except Exception as e:
        logger.error(f"Error checking domain health: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check domain health"
        )


# SSL Certificate Endpoints

@router.post("/domains/{domain}/ssl/provision", response_model=SSLCertificateResponse)
async def provision_ssl_certificate(
    domain: str,
    provider: SSLProvider = Query(
        SSLProvider.LETS_ENCRYPT, description="SSL provider"),
    merchant_context: MerchantAuthContext = Depends(require_merchant_admin),
    db: AsyncSession = Depends(get_db)
):
    """Provision SSL certificate for domain."""
    try:
        domain_service = EnhancedDomainService(db)
        tenant_id = str(merchant_context.tenant.id)

        certificate = await domain_service.provision_ssl_certificate(
            domain=domain,
            tenant_id=tenant_id,
            provider=provider
        )

        return SSLCertificateResponse(
            domain=certificate.domain,
            provider=certificate.provider.value,
            issued_at=certificate.issued_at.isoformat(),
            expires_at=certificate.expires_at.isoformat(),
            is_valid=certificate.is_valid,
            auto_renew=certificate.auto_renew
        )

    except Exception as e:
        logger.error(f"Error provisioning SSL certificate: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to provision SSL certificate"
        )


@router.post("/domains/{domain}/ssl/renew", response_model=SSLCertificateResponse)
async def renew_ssl_certificate(
    domain: str,
    merchant_context: MerchantAuthContext = Depends(require_merchant_admin),
    db: AsyncSession = Depends(get_db)
):
    """Renew SSL certificate for domain."""
    try:
        domain_service = EnhancedDomainService(db)
        tenant_id = str(merchant_context.tenant.id)

        certificate = await domain_service.renew_ssl_certificate(domain, tenant_id)

        return SSLCertificateResponse(
            domain=certificate.domain,
            provider=certificate.provider.value,
            issued_at=certificate.issued_at.isoformat(),
            expires_at=certificate.expires_at.isoformat(),
            is_valid=certificate.is_valid,
            auto_renew=certificate.auto_renew
        )

    except Exception as e:
        logger.error(f"Error renewing SSL certificate: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to renew SSL certificate"
        )


# Domain Analytics Endpoints

@router.get("/domains/{domain}/analytics", response_model=DomainAnalyticsResponse)
async def get_domain_analytics(
    domain: str,
    period_days: int = Query(
        30, ge=1, le=365, description="Analytics period in days"),
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """Get analytics data for domain."""
    try:
        domain_service = EnhancedDomainService(db)
        tenant_id = str(merchant_context.tenant.id)

        analytics = await domain_service.get_domain_analytics(
            domain=domain,
            tenant_id=tenant_id,
            period_days=period_days
        )

        return DomainAnalyticsResponse(
            domain=analytics.domain,
            period_start=analytics.period_start.isoformat(),
            period_end=analytics.period_end.isoformat(),
            total_requests=analytics.total_requests,
            unique_visitors=analytics.unique_visitors,
            response_time_avg=analytics.response_time_avg,
            response_time_p95=analytics.response_time_p95,
            error_rate=analytics.error_rate,
            ssl_issues=analytics.ssl_issues,
            uptime_percentage=analytics.uptime_percentage,
            bandwidth_mb=analytics.bandwidth_mb
        )

    except Exception as e:
        logger.error(f"Error getting domain analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get domain analytics"
        )


# Domain Status and Information Endpoints

@router.get("/domains", response_model=List[Dict[str, Any]])
async def list_domains(
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """List all domains for the merchant."""
    try:
        tenant = merchant_context.tenant
        domains = []

        # Add subdomain
        domains.append({
            "domain": f"{tenant.subdomain}.enwhe.io",
            "type": "subdomain",
            "status": "active",
            "primary": True,
            "ssl_enabled": True,
            "created_at": tenant.created_at.isoformat() if tenant.created_at else None
        })

        # Add custom domain if configured
        if tenant.custom_domain:
            domains.append({
                "domain": tenant.custom_domain,
                "type": "custom",
                "status": "verified" if tenant.domain_verified else "pending_verification",
                "primary": False,
                "ssl_enabled": True,
                "created_at": tenant.created_at.isoformat() if tenant.created_at else None
            })

        return domains

    except Exception as e:
        logger.error(f"Error listing domains: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list domains"
        )


@router.get("/domains/{domain}/status")
async def get_domain_status(
    domain: str,
    merchant_context: MerchantAuthContext = Depends(get_merchant_auth_context),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive domain status information."""
    try:
        domain_service = EnhancedDomainService(db)
        tenant_id = str(merchant_context.tenant.id)

        # Get domain health
        health = await domain_service.check_domain_health(domain)

        # Get domain config (would be from database in real implementation)
        domain_config = await domain_service._get_domain_config(domain, tenant_id)

        return {
            "domain": domain,
            "tenant_id": tenant_id,
            "status": domain_config.get("status") if domain_config else "unknown",
            "health": {
                "is_healthy": health.is_healthy,
                "response_time_ms": health.response_time_ms,
                "ssl_valid": health.ssl_valid,
                "ssl_expires_at": health.ssl_expires_at.isoformat() if health.ssl_expires_at else None,
                "dns_resolves": health.dns_resolves,
                "http_status": health.http_status,
                "last_checked": health.last_checked.isoformat(),
                "issues": health.issues
            },
            "ssl": {
                "enabled": domain_config.get("ssl_enabled", False) if domain_config else False,
                "provider": domain_config.get("ssl_provider") if domain_config else None,
                "auto_renew": domain_config.get("auto_renew", False) if domain_config else False
            },
            "verification": {
                "verified": domain_config.get("status") == "verified" if domain_config else False,
                "token": domain_config.get("verification_token") if domain_config else None
            },
            "last_updated": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error getting domain status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get domain status"
        )


# SSL Providers and Configuration

@router.get("/ssl/providers")
async def list_ssl_providers():
    """List available SSL certificate providers."""
    return {
        "providers": [
            {
                "code": provider.value,
                "name": provider.value.replace("_", " ").title(),
                "description": f"{provider.value.replace('_', ' ').title()} SSL certificates",
                "auto_provision": provider != SSLProvider.CUSTOM,
                "auto_renew": provider != SSLProvider.CUSTOM
            }
            for provider in SSLProvider
        ]
    }


@router.get("/health")
async def domain_health_check():
    """Health check endpoint for domain services."""
    return {
        "status": "healthy",
        "service": "enhanced_domain",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
