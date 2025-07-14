from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.app.models.analytics import ScheduledReport as ScheduledReportModel
from app.app.schemas.analytics import ScheduledReportCreate, ScheduledReportUpdate, ScheduledReport

class ScheduledReportRepository:
    @staticmethod
    async def create(db: Session, report: ScheduledReportCreate, tenant_id: int) -> ScheduledReport:
        """Create a new scheduled report"""
        db_report = ScheduledReportModel(
            tenant_id=tenant_id,
            name=report.name,
            description=report.description,
            query_params=report.query_params.dict(),
            frequency=report.frequency,
            recipient_emails=report.recipient_emails,
            export_format=report.export_format,
            enabled=report.enabled,
            next_run_date=report.next_run_date
        )
        
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        
        return ScheduledReport.from_orm(db_report)

    @staticmethod
    async def get(db: Session, report_id: int, tenant_id: int) -> Optional[ScheduledReport]:
        """Get a scheduled report by ID"""
        db_report = db.query(ScheduledReportModel).filter(
            and_(
                ScheduledReportModel.id == report_id,
                ScheduledReportModel.tenant_id == tenant_id
            )
        ).first()
        
        if db_report:
            return ScheduledReport.from_orm(db_report)
        
        return None

    @staticmethod
    async def update(
        db: Session, 
        report_id: int, 
        report: ScheduledReportUpdate, 
        tenant_id: int
    ) -> Optional[ScheduledReport]:
        """Update a scheduled report"""
        db_report = db.query(ScheduledReportModel).filter(
            and_(
                ScheduledReportModel.id == report_id,
                ScheduledReportModel.tenant_id == tenant_id
            )
        ).first()
        
        if not db_report:
            return None
        
        # Update fields
        update_data = report.dict(exclude_unset=True)
        
        # Handle query_params separately as it needs to be converted to dict
        if "query_params" in update_data:
            update_data["query_params"] = update_data["query_params"].dict()
        
        for key, value in update_data.items():
            setattr(db_report, key, value)
        
        db.commit()
        db.refresh(db_report)
        
        return ScheduledReport.from_orm(db_report)

    @staticmethod
    async def delete(db: Session, report_id: int, tenant_id: int) -> bool:
        """Delete a scheduled report"""
        db_report = db.query(ScheduledReportModel).filter(
            and_(
                ScheduledReportModel.id == report_id,
                ScheduledReportModel.tenant_id == tenant_id
            )
        ).first()
        
        if not db_report:
            return False
        
        db.delete(db_report)
        db.commit()
        
        return True

    @staticmethod
    async def get_all(db: Session, tenant_id: int) -> List[ScheduledReport]:
        """Get all scheduled reports for a tenant"""
        db_reports = db.query(ScheduledReportModel).filter(
            ScheduledReportModel.tenant_id == tenant_id
        ).all()
        
        return [ScheduledReport.from_orm(report) for report in db_reports]

    @staticmethod
    async def get_due_reports(db: Session) -> List[ScheduledReport]:
        """Get all scheduled reports that are due for processing"""
        now = datetime.now()
        
        db_reports = db.query(ScheduledReportModel).filter(
            and_(
                ScheduledReportModel.next_run_date <= now,
                ScheduledReportModel.enabled == True
            )
        ).all()
        
        return [ScheduledReport.from_orm(report) for report in db_reports]

    @staticmethod
    async def update_last_run(db: Session, report_id: int, run_date: datetime) -> bool:
        """Update the last_run_date and calculate next_run_date for a report"""
        db_report = db.query(ScheduledReportModel).filter(
            ScheduledReportModel.id == report_id
        ).first()
        
        if not db_report:
            return False
        
        db_report.last_run_date = run_date
        
        # Calculate next run date based on frequency
        from app.app.services.report_scheduler_service import ReportSchedulerService
        db_report.next_run_date = await ReportSchedulerService.calculate_next_run_date(
            db_report.frequency, 
            run_date
        )
        
        db.commit()
        
        return True
