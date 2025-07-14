from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import pandas as pd
from datetime import datetime, timedelta

from app.app.core.database import get_db
from app.app.core.security import get_current_user_id, get_tenant_id_from_headers
from app.app.schemas.analytics import (
    AnalyticsEvent, AnalyticsEventCreate, 
    AnalyticsMetric, AnalyticsMetricCreate, AnalyticsMetricUpdate,
    AnalyticsReport, AnalyticsReportCreate, AnalyticsReportUpdate,
    AnalyticsQuery, AnalyticsExportQuery, AnalyticsExportFormat
)
from app.app.repositories.analytics_repository import AnalyticsRepository

router = APIRouter()


@router.post("/events", response_model=AnalyticsEvent)
async def create_event(
    event: AnalyticsEventCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Create a new analytics event"""
    return await AnalyticsRepository.create_event(db, event, tenant_id)


@router.post("/events/batch", response_model=List[AnalyticsEvent])
async def batch_create_events(
    events: List[AnalyticsEventCreate],
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Create multiple analytics events at once"""
    return await AnalyticsRepository.batch_create_events(db, events, tenant_id)


@router.get("/events", response_model=List[AnalyticsEvent])
async def get_events(
    skip: int = 0,
    limit: int = 100,
    event_type: Optional[str] = None,
    event_category: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Get analytics events with optional filters"""
    return await AnalyticsRepository.get_events(
        db, tenant_id, skip, limit, 
        event_type, event_category, start_date, end_date
    )


@router.post("/metrics", response_model=AnalyticsMetric)
async def create_metric(
    metric: AnalyticsMetricCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Create a new analytics metric"""
    return await AnalyticsRepository.create_metric(db, metric, tenant_id)


@router.post("/metrics/batch", response_model=List[AnalyticsMetric])
async def batch_create_metrics(
    metrics: List[AnalyticsMetricCreate],
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Create multiple analytics metrics at once"""
    return await AnalyticsRepository.batch_create_metrics(db, metrics, tenant_id)


@router.put("/metrics/{metric_id}", response_model=AnalyticsMetric)
async def update_metric(
    metric_id: int,
    update_data: AnalyticsMetricUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Update an existing metric"""
    metric = await AnalyticsRepository.update_metric(db, metric_id, update_data, tenant_id)
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    return metric


@router.get("/metrics", response_model=List[AnalyticsMetric])
async def get_metrics(
    metric_keys: Optional[List[str]] = Query(None),
    metric_category: Optional[str] = None,
    dimension: Optional[str] = None,
    dimension_value: Optional[str] = None,
    time_period: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    is_final: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Get analytics metrics with optional filters"""
    return await AnalyticsRepository.get_metrics(
        db, tenant_id, metric_keys, metric_category, dimension, dimension_value,
        time_period, start_date, end_date, is_final, skip, limit
    )


@router.post("/reports", response_model=AnalyticsReport)
async def create_report(
    report: AnalyticsReportCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers),
    user_id: int = Depends(get_current_user_id)
):
    """Create a new analytics report"""
    return await AnalyticsRepository.create_report(db, report, tenant_id, user_id)


@router.put("/reports/{report_id}", response_model=AnalyticsReport)
async def update_report(
    report_id: int,
    update_data: AnalyticsReportUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Update an existing report"""
    report = await AnalyticsRepository.update_report(db, report_id, update_data, tenant_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/reports", response_model=List[AnalyticsReport])
async def get_reports(
    report_type: Optional[str] = None,
    created_by: Optional[int] = None,
    is_scheduled: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Get analytics reports with optional filters"""
    return await AnalyticsRepository.get_reports(
        db, tenant_id, report_type, created_by, is_scheduled, skip, limit
    )


@router.get("/reports/{report_id}", response_model=AnalyticsReport)
async def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Get report by ID"""
    report = await AnalyticsRepository.get_report_by_id(db, report_id, tenant_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.delete("/reports/{report_id}")
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Delete a report"""
    success = await AnalyticsRepository.delete_report(db, report_id, tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"success": True}


@router.post("/query")
async def query_analytics(
    query: AnalyticsQuery,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Query analytics data"""
    df = await AnalyticsRepository.aggregate_metrics(db, query, tenant_id)
    
    # Convert pandas DataFrame to JSON-compatible format
    if df.empty:
        return {"data": [], "count": 0}
        
    return {
        "data": df.to_dict(orient="records"),
        "count": len(df),
        "columns": list(df.columns)
    }


@router.post("/real-time")
async def get_real_time_analytics(
    query: AnalyticsQuery,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Get real-time analytics data for dashboard"""
    # Adjust query to focus on recent data (last hour)
    real_time_query = AnalyticsQuery(
        metrics=query.metrics,
        dimensions=query.dimensions,
        filters=query.filters,
        dateRange={
            "startDate": datetime.now() - timedelta(hours=1),
            "endDate": datetime.now()
        },
        sortBy=query.sortBy,
        sortDesc=query.sortDesc,
        limit=query.limit,
        offset=query.offset
    )
    
    df = await AnalyticsRepository.aggregate_metrics(db, real_time_query, tenant_id)
    
    # Convert pandas DataFrame to JSON-compatible format
    if df.empty:
        return {"data": [], "count": 0}
        
    return {
        "data": df.to_dict(orient="records"),
        "count": len(df),
        "columns": list(df.columns),
        "lastUpdated": datetime.now().isoformat()
    }


@router.post("/export")
async def export_analytics(
    query: AnalyticsExportQuery,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Export analytics data in specified format"""
    # Query data
    df = await AnalyticsRepository.aggregate_metrics(db, query, tenant_id)
    
    # Get export format
    export_format = query.format
    include_headers = query.include_headers
    
    # Export data
    data_bytes, mime_type = await AnalyticsRepository.export_analytics_data(
        df, export_format, include_headers
    )
    
    # Generate file name
    metrics = "-".join(query.metrics[:2])  # First 2 metrics to keep filename reasonable
    date_str = datetime.now().strftime("%Y%m%d-%H%M%S")
    
    file_extension = {
        AnalyticsExportFormat.CSV: "csv",
        AnalyticsExportFormat.EXCEL: "xlsx",
        AnalyticsExportFormat.JSON: "json"
    }[export_format]
    
    filename = f"analytics-{metrics}-{date_str}.{file_extension}"
    
    # Return file as download
    return StreamingResponse(
        io.BytesIO(data_bytes),
        media_type=mime_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/reports/{report_id}/schedule")
async def schedule_report(
    report_id: int,
    schedule_config: Dict[str, Any],
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Schedule a report for regular delivery"""
    report = await AnalyticsRepository.get_report_by_id(db, report_id, tenant_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Update report with schedule config
    update_data = AnalyticsReportUpdate(
        is_scheduled=True,
        schedule_config=schedule_config
    )
    
    updated_report = await AnalyticsRepository.update_report(db, report_id, update_data, tenant_id)
    return updated_report
