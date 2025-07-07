"""
Pydantic schemas for the unified super admin dashboard.
Comprehensive models for metrics, KPIs, activity feed, and system health.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field


class TenantOverview(BaseModel):
    """Tenant metrics overview."""
    total_tenants: int = Field(..., description="Total number of tenants")
    active_tenants: int = Field(..., description="Number of active tenants")
    verified_tenants: int = Field(...,
                                  description="Number of verified tenants")
    new_tenants: int = Field(..., description="New tenants in period")
    growth_rate: float = Field(...,
                               description="Tenant growth rate percentage")


class UserMetrics(BaseModel):
    """User metrics and statistics."""
    total_users: int = Field(..., description="Total number of users")
    active_users: int = Field(..., description="Number of active users")
    new_users: int = Field(..., description="New users in period")
    active_in_period: int = Field(..., description="Users active in period")
    retention_rate: float = Field(...,
                                  description="User retention rate percentage")


class OrderMetrics(BaseModel):
    """Order metrics and revenue statistics."""
    total_orders: int = Field(..., description="Total number of orders")
    completed_orders: int = Field(...,
                                  description="Number of completed orders")
    recent_orders: int = Field(..., description="Recent orders in period")
    total_revenue: float = Field(..., description="Total revenue amount")
    avg_order_value: float = Field(..., description="Average order value")
    completion_rate: float = Field(...,
                                   description="Order completion rate percentage")


class ProductMetrics(BaseModel):
    """Product catalog metrics."""
    total_products: int = Field(..., description="Total number of products")
    active_products: int = Field(..., description="Number of active products")
    new_products: int = Field(..., description="New products in period")
    total_inventory: int = Field(..., description="Total inventory count")


class SecurityMetrics(BaseModel):
    """Security metrics and threat assessment."""
    successful_logins: int = Field(...,
                                   description="Number of successful logins")
    failed_logins: int = Field(...,
                               description="Number of failed login attempts")
    security_violations: int = Field(...,
                                     description="Number of security violations")
    emergency_lockdowns: int = Field(...,
                                     description="Number of emergency lockdowns")
    threat_level: str = Field(...,
                              description="Current threat level (LOW/MEDIUM/HIGH/CRITICAL)")


class PerformanceMetrics(BaseModel):
    """System performance metrics."""
    total_requests: int = Field(..., description="Total API requests")
    avg_response_time: float = Field(...,
                                     description="Average response time in seconds")
    error_count: int = Field(..., description="Number of errors")
    uptime_percentage: float = Field(...,
                                     description="System uptime percentage")


class DashboardMetrics(BaseModel):
    """Comprehensive dashboard metrics model."""
    tenant_metrics: TenantOverview
    user_metrics: UserMetrics
    order_metrics: OrderMetrics
    product_metrics: ProductMetrics
    security_metrics: SecurityMetrics
    performance_metrics: PerformanceMetrics
    last_updated: datetime = Field(..., description="Last update timestamp")


class DashboardKPIs(BaseModel):
    """Key performance indicators for dashboard."""
    total_tenants: int = Field(..., description="Total number of tenants")
    active_tenants: int = Field(..., description="Number of active tenants")
    total_users: int = Field(..., description="Total number of users")
    active_users: int = Field(..., description="Number of active users")
    total_orders: int = Field(..., description="Total number of orders")
    total_revenue: float = Field(..., description="Total revenue amount")
    avg_daily_tenants: float = Field(...,
                                     description="Average daily new tenants")
    avg_daily_users: float = Field(..., description="Average daily new users")
    avg_daily_orders: float = Field(..., description="Average daily orders")
    avg_daily_revenue: float = Field(..., description="Average daily revenue")
    system_health_score: float = Field(..., ge=0, le=100,
                                       description="System health score (0-100)")
    security_score: float = Field(..., ge=0, le=100,
                                  description="Security score (0-100)")
    errors_today: int = Field(..., description="Number of errors today")
    security_events_today: int = Field(...,
                                       description="Security events today")
    lockdowns_today: int = Field(..., description="Emergency lockdowns today")


class ActivityFeedItem(BaseModel):
    """Individual activity feed item."""
    id: str = Field(..., description="Unique activity ID")
    event_type: str = Field(..., description="Type of event")
    actor_id: Optional[str] = Field(
        None, description="ID of user who performed action")
    target_id: Optional[str] = Field(None, description="ID of target entity")
    target_type: Optional[str] = Field(
        None, description="Type of target entity")
    title: str = Field(..., description="Human-readable title")
    description: str = Field(..., description="Detailed description")
    timestamp: datetime = Field(..., description="Event timestamp")
    ip_address: Optional[str] = Field(None, description="IP address of actor")
    severity: str = Field(...,
                          description="Severity level (info/warning/critical)")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional event metadata")


class RecentActivity(BaseModel):
    """Recent activity summary."""
    total_events: int = Field(..., description="Total number of events")
    critical_events: int = Field(..., description="Number of critical events")
    warning_events: int = Field(..., description="Number of warning events")
    info_events: int = Field(..., description="Number of info events")
    activities: List[ActivityFeedItem] = Field(
        ..., description="List of recent activities")


class SystemHealthMetrics(BaseModel):
    """Comprehensive system health metrics."""
    overall_status: str = Field(..., description="Overall system status")
    uptime_percentage: float = Field(..., ge=0,
                                     le=100, description="System uptime percentage")
    database_status: str = Field(..., description="Database health status")
    database_response_time: float = Field(...,
                                          description="Database response time in seconds")
    api_response_time: float = Field(...,
                                     description="Average API response time in seconds")
    error_rate: float = Field(..., ge=0, le=100,
                              description="Error rate percentage")
    active_connections: int = Field(...,
                                    description="Number of active connections")
    memory_usage: float = Field(..., ge=0, le=100,
                                description="Memory usage percentage")
    cpu_usage: float = Field(..., ge=0, le=100,
                             description="CPU usage percentage")
    disk_usage: float = Field(..., ge=0, le=100,
                              description="Disk usage percentage")
    last_deployment: datetime = Field(...,
                                      description="Last deployment timestamp")
    alerts_count: int = Field(..., description="Number of active alerts")
    critical_alerts_count: int = Field(...,
                                       description="Number of critical alerts")
    services_status: Dict[str,
                          str] = Field(..., description="Status of individual services")


class AlertSummary(BaseModel):
    """Summary of system alerts and notifications."""
    total_alerts: int = Field(..., description="Total number of alerts")
    critical_alerts: int = Field(..., description="Number of critical alerts")
    warning_alerts: int = Field(..., description="Number of warning alerts")
    info_alerts: int = Field(..., description="Number of info alerts")
    alerts: List[Dict[str, Any]
                 ] = Field(..., description="List of alert details")
    last_updated: datetime = Field(..., description="Last update timestamp")


# RBAC Management Schemas

class Permission(BaseModel):
    """Individual permission model."""
    id: str = Field(..., description="Permission ID")
    name: str = Field(..., description="Permission name")
    description: str = Field(..., description="Permission description")
    resource: str = Field(...,
                          description="Resource this permission applies to")
    action: str = Field(..., description="Action this permission allows")
    scope: str = Field(...,
                       description="Scope of permission (global/tenant/self)")


class Role(BaseModel):
    """Role model with permissions."""
    id: str = Field(..., description="Role ID")
    name: str = Field(..., description="Role name")
    description: str = Field(..., description="Role description")
    permissions: List[Permission] = Field(...,
                                          description="List of role permissions")
    is_system_role: bool = Field(...,
                                 description="Whether this is a system-defined role")
    created_at: datetime = Field(..., description="Role creation timestamp")
    updated_at: datetime = Field(..., description="Role last update timestamp")


class UserRole(BaseModel):
    """User role assignment model."""
    user_id: str = Field(..., description="User ID")
    role_id: str = Field(..., description="Role ID")
    assigned_by: str = Field(...,
                             description="ID of user who assigned the role")
    assigned_at: datetime = Field(..., description="Role assignment timestamp")
    expires_at: Optional[datetime] = Field(
        None, description="Role expiration timestamp")
    scope: str = Field(..., description="Scope of role assignment")
    scope_id: Optional[str] = Field(
        None, description="ID of scope entity (e.g., tenant_id)")


class RoleCreateRequest(BaseModel):
    """Request model for creating a new role."""
    name: str = Field(..., min_length=1, max_length=100,
                      description="Role name")
    description: str = Field(..., min_length=1,
                             max_length=500, description="Role description")
    permission_ids: List[str] = Field(...,
                                      description="List of permission IDs to assign")


class RoleUpdateRequest(BaseModel):
    """Request model for updating an existing role."""
    name: Optional[str] = Field(
        None, min_length=1, max_length=100, description="Role name")
    description: Optional[str] = Field(
        None, min_length=1, max_length=500, description="Role description")
    permission_ids: Optional[List[str]] = Field(
        None, description="List of permission IDs to assign")


class UserRoleAssignRequest(BaseModel):
    """Request model for assigning role to user."""
    user_id: str = Field(..., description="User ID to assign role to")
    role_id: str = Field(..., description="Role ID to assign")
    scope: str = Field(...,
                       description="Scope of assignment (global/tenant/self)")
    scope_id: Optional[str] = Field(None, description="ID of scope entity")
    expires_at: Optional[datetime] = Field(
        None, description="Optional expiration date")


class PermissionAuditLog(BaseModel):
    """Permission audit log entry."""
    id: str = Field(..., description="Audit log ID")
    action: str = Field(..., description="Action performed")
    actor_id: str = Field(..., description="ID of user who performed action")
    target_user_id: Optional[str] = Field(None, description="Target user ID")
    role_id: Optional[str] = Field(None, description="Role ID involved")
    permission_id: Optional[str] = Field(
        None, description="Permission ID involved")
    details: Dict[str, Any] = Field(...,
                                    description="Additional audit details")
    timestamp: datetime = Field(..., description="Action timestamp")
    ip_address: Optional[str] = Field(None, description="IP address of actor")


# Global Search Schemas

class SearchFilter(BaseModel):
    """Search filter model."""
    field: str = Field(..., description="Field to filter on")
    operator: str = Field(...,
                          description="Filter operator (eq, contains, gt, lt, etc.)")
    value: Union[str, int, float, bool,
                 datetime] = Field(..., description="Filter value")


class SearchRequest(BaseModel):
    """Global search request model."""
    query: str = Field(..., min_length=1, description="Search query string")
    filters: List[SearchFilter] = Field(
        default_factory=list, description="Search filters")
    modules: List[str] = Field(
        default_factory=list, description="Modules to search in")
    tenant_ids: List[str] = Field(
        default_factory=list, description="Tenant IDs to search in")
    limit: int = Field(default=50, ge=1, le=100,
                       description="Maximum results to return")
    offset: int = Field(
        default=0, ge=0, description="Result offset for pagination")
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: str = Field(
        default="desc", description="Sort order (asc/desc)")


class SearchResultItem(BaseModel):
    """Individual search result item."""
    id: str = Field(..., description="Result item ID")
    type: str = Field(...,
                      description="Type of result (tenant, user, order, product, etc.)")
    title: str = Field(..., description="Result title")
    description: str = Field(..., description="Result description")
    url: str = Field(..., description="URL to view/edit this item")
    tenant_id: Optional[str] = Field(
        None, description="Tenant ID this item belongs to")
    module: str = Field(..., description="Module this item belongs to")
    score: float = Field(..., description="Search relevance score")
    highlight: Dict[str, List[str]] = Field(
        default_factory=dict, description="Highlighted search terms")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional item metadata")
    created_at: datetime = Field(..., description="Item creation timestamp")
    updated_at: datetime = Field(..., description="Item last update timestamp")


class GlobalSearchResult(BaseModel):
    """Global search results model."""
    query: str = Field(..., description="Original search query")
    total_results: int = Field(...,
                               description="Total number of results found")
    results: List[SearchResultItem] = Field(...,
                                            description="List of search results")
    facets: Dict[str, Dict[str, int]] = Field(
        default_factory=dict, description="Search facets and counts")
    execution_time: float = Field(...,
                                  description="Search execution time in seconds")
    suggestions: List[str] = Field(
        default_factory=list, description="Search query suggestions")


class SearchHistory(BaseModel):
    """Search history item."""
    id: str = Field(..., description="History item ID")
    user_id: str = Field(..., description="User who performed search")
    query: str = Field(..., description="Search query")
    filters: List[SearchFilter] = Field(..., description="Filters used")
    results_count: int = Field(..., description="Number of results returned")
    timestamp: datetime = Field(..., description="Search timestamp")


class SearchFavorite(BaseModel):
    """Saved search favorite."""
    id: str = Field(..., description="Favorite ID")
    user_id: str = Field(..., description="User who saved the search")
    name: str = Field(..., description="Favorite name")
    query: str = Field(..., description="Search query")
    filters: List[SearchFilter] = Field(..., description="Saved filters")
    created_at: datetime = Field(...,
                                 description="Favorite creation timestamp")
    last_used: Optional[datetime] = Field(
        None, description="Last time favorite was used")
