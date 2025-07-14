from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session

from app.app.core.database import get_db
from app.app.core.security import get_tenant_id_from_headers
from app.app.schemas.analytics import (
    ScheduledReport, 
    ScheduledReportCreate, 
    ScheduledReportUpdate,
    ScheduledReportResponse
)
from app.app.services.report_scheduler_service import ReportSchedulerService

router = APIRouter()

@router.post("/", response_model=ScheduledReportResponse)
async def create_scheduled_report(
    report: ScheduledReportCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Create a new scheduled report"""
    scheduled_report = await ReportSchedulerService.create_scheduled_report(db, report, tenant_id)
    return {"success": True, "data": scheduled_report}

@router.get("/", response_model=ScheduledReportResponse)
async def get_all_scheduled_reports(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """Get all scheduled reports for the tenant"""
    reports = await ReportSchedulerService.get_all_scheduled_reports(db, tenant_id)
    
    # Apply pagination
    paginated_reports = reports[skip:skip + limit]
    
    return {
        "success": True, 
        "data": paginated_reports,
        "count": len(reports),
        "skip": skip,
        "limit": limit
    }

@router.get("/{report_id}", response_model=ScheduledReportResponse)
async def get_scheduled_report(
    report_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Get a scheduled report by ID"""
    report = await ReportSchedulerService.get_scheduled_report(db, report_id, tenant_id)
    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    return {"success": True, "data": report}

@router.put("/{report_id}", response_model=ScheduledReportResponse)
async def update_scheduled_report(
    report_id: int,
    report: ScheduledReportUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Update a scheduled report"""
    updated_report = await ReportSchedulerService.update_scheduled_report(db, report_id, report, tenant_id)
    if not updated_report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    return {"success": True, "data": updated_report}

@router.delete("/{report_id}", response_model=ScheduledReportResponse)
async def delete_scheduled_report(
    report_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Delete a scheduled report"""
    success = await ReportSchedulerService.delete_scheduled_report(db, report_id, tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    return {"success": True, "data": None}

@router.post("/run/{report_id}", response_model=ScheduledReportResponse)
async def run_report_now(
    report_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id_from_headers)
):
    """Run a scheduled report immediately"""
    report = await ReportSchedulerService.get_scheduled_report(db, report_id, tenant_id)
    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    
    # Run report in the background
    background_tasks.add_task(
        ReportSchedulerService._generate_and_send_report,
        db,
        report
    )
    
    return {"success": True, "data": {"message": "Report scheduled for immediate execution"}}

@router.post("/process", response_model=ScheduledReportResponse)
async def process_due_reports(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Process all scheduled reports that are due
    
    This endpoint should be called by a cron job or scheduler
    """
    # This endpoint requires admin access (handled by auth middleware)
    await ReportSchedulerService.process_scheduled_reports(db, background_tasks)
    return {"success": True, "data": {"message": "Processing scheduled reports"}}
