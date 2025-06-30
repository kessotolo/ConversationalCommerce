from typing import Optional, Dict, List, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum


class EventCategory(str, Enum):
    PAGE_VIEW = "page_view"
    ENGAGEMENT = "engagement"
    CONVERSION = "conversion"
    PRODUCT = "product"
    CHECKOUT = "checkout"
    ORDER = "order"
    USER = "user"
    SESSION = "session"
    CUSTOM = "custom"


class MetricCategory(str, Enum):
    REVENUE = "revenue"
    ORDERS = "orders"
    PRODUCTS = "products"
    USERS = "users"
    ENGAGEMENT = "engagement"
    CONVERSION = "conversion"
    PERFORMANCE = "performance"
    CUSTOM = "custom"


class TimePeriod(str, Enum):
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class VisualizationType(str, Enum):
    LINE_CHART = "line_chart"
    BAR_CHART = "bar_chart"
    PIE_CHART = "pie_chart"
    TABLE = "table"
    GAUGE = "gauge"
    COUNTER = "counter"
    HEATMAP = "heatmap"
    CUSTOM = "custom"


# Base schemas
class AnalyticsEventBase(BaseModel):
    event_type: str
    event_category: EventCategory
    event_name: str
    event_value: Optional[float] = None
    event_data: Optional[Dict[str, Any]] = None
    user_id: Optional[int] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    referrer: Optional[str] = None
    page_url: Optional[str] = None


class AnalyticsMetricBase(BaseModel):
    metric_key: str
    metric_category: MetricCategory
    metric_value: float
    dimension: Optional[str] = None
    dimension_value: Optional[str] = None
    time_period: TimePeriod
    time_value: str
    start_date: datetime
    end_date: datetime
    is_final: bool = True


class AnalyticsReportBase(BaseModel):
    name: str
    description: Optional[str] = None
    report_type: str
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    metrics: List[str]
    dimensions: Optional[List[str]] = Field(default_factory=list)
    date_range: Dict[str, Union[datetime, str]]
    visualization_type: VisualizationType
    visualization_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_scheduled: bool = False
    schedule_config: Optional[Dict[str, Any]] = Field(default_factory=dict)


# Create schemas
class AnalyticsEventCreate(AnalyticsEventBase):
    pass


class AnalyticsMetricCreate(AnalyticsMetricBase):
    pass


class AnalyticsReportCreate(AnalyticsReportBase):
    pass


# Read schemas
class AnalyticsEvent(AnalyticsEventBase):
    id: int
    tenant_id: int
    created_at: datetime

    class Config:
        orm_mode = True


class AnalyticsMetric(AnalyticsMetricBase):
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class AnalyticsReport(AnalyticsReportBase):
    id: int
    tenant_id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# Update schemas
class AnalyticsEventUpdate(BaseModel):
    event_value: Optional[float] = None
    event_data: Optional[Dict[str, Any]] = None


class AnalyticsMetricUpdate(BaseModel):
    metric_value: Optional[float] = None
    is_final: Optional[bool] = None


class AnalyticsReportUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    metrics: Optional[List[str]] = None
    dimensions: Optional[List[str]] = None
    date_range: Optional[Dict[str, Union[datetime, str]]] = None
    visualization_type: Optional[VisualizationType] = None
    visualization_config: Optional[Dict[str, Any]] = None
    is_scheduled: Optional[bool] = None
    schedule_config: Optional[Dict[str, Any]] = None


# Query schemas
class DateRangeParams(BaseModel):
    start_date: datetime
    end_date: datetime


class AnalyticsQuery(BaseModel):
    metrics: List[str]
    dimensions: Optional[List[str]] = Field(default_factory=list)
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    date_range: DateRangeParams
    sort_by: Optional[str] = None
    sort_desc: bool = False
    limit: Optional[int] = None
    offset: Optional[int] = None


class AnalyticsExportFormat(str, Enum):
    CSV = "csv"
    EXCEL = "excel"
    JSON = "json"


class AnalyticsExportQuery(AnalyticsQuery):
    format: AnalyticsExportFormat = AnalyticsExportFormat.CSV
    include_headers: bool = True
