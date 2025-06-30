from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta
import pandas as pd
import smtplib
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.analytics import ScheduledReportCreate, ScheduledReportUpdate, ScheduledReport, ReportScheduleFrequency
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.scheduled_report_repository import ScheduledReportRepository
from app.schemas.analytics import AnalyticsQuery, AnalyticsExportFormat

logger = logging.getLogger(__name__)

class ReportSchedulerService:
    @staticmethod
    async def create_scheduled_report(
        db: Session, 
        report_data: ScheduledReportCreate,
        tenant_id: int
    ) -> ScheduledReport:
        """Create a new scheduled report"""
        return await ScheduledReportRepository.create(db, report_data, tenant_id)

    @staticmethod
    async def update_scheduled_report(
        db: Session,
        report_id: int,
        report_data: ScheduledReportUpdate,
        tenant_id: int
    ) -> Optional[ScheduledReport]:
        """Update an existing scheduled report"""
        return await ScheduledReportRepository.update(db, report_id, report_data, tenant_id)

    @staticmethod
    async def delete_scheduled_report(
        db: Session,
        report_id: int,
        tenant_id: int
    ) -> bool:
        """Delete a scheduled report"""
        return await ScheduledReportRepository.delete(db, report_id, tenant_id)

    @staticmethod
    async def get_scheduled_report(
        db: Session,
        report_id: int,
        tenant_id: int
    ) -> Optional[ScheduledReport]:
        """Get a scheduled report by ID"""
        return await ScheduledReportRepository.get(db, report_id, tenant_id)

    @staticmethod
    async def get_all_scheduled_reports(
        db: Session,
        tenant_id: int
    ) -> List[ScheduledReport]:
        """Get all scheduled reports for a tenant"""
        return await ScheduledReportRepository.get_all(db, tenant_id)

    @staticmethod
    async def get_reports_due_for_processing(
        db: Session
    ) -> List[ScheduledReport]:
        """Get all scheduled reports that are due for processing"""
        return await ScheduledReportRepository.get_due_reports(db)

    @staticmethod
    async def process_scheduled_reports(db: Session, background_tasks: BackgroundTasks):
        """Process all scheduled reports that are due"""
        due_reports = await ReportSchedulerService.get_reports_due_for_processing(db)
        
        for report in due_reports:
            # Schedule report generation and delivery as background task
            background_tasks.add_task(
                ReportSchedulerService._generate_and_send_report,
                db,
                report
            )
            
            # Update last_run time
            await ScheduledReportRepository.update_last_run(db, report.id, datetime.now())
    
    @staticmethod
    async def _generate_and_send_report(db: Session, report: ScheduledReport):
        """Generate and send a scheduled report"""
        logger.info(f"Generating scheduled report {report.id}: {report.name}")
        
        try:
            # Parse query parameters from report configuration
            query = AnalyticsQuery(**report.query_params)
            
            # Get data for report
            data = await AnalyticsRepository.aggregate_metrics(
                db, 
                query, 
                report.tenant_id
            )
            
            if data.empty:
                logger.warning(f"No data found for report {report.id}")
                return
            
            # Generate report file based on format
            report_file = None
            filename = f"{report.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}"
            
            if report.export_format == AnalyticsExportFormat.csv:
                report_file = ReportSchedulerService._generate_csv(data, filename)
            elif report.export_format == AnalyticsExportFormat.excel:
                report_file = ReportSchedulerService._generate_excel(data, filename)
            elif report.export_format == AnalyticsExportFormat.json:
                report_file = ReportSchedulerService._generate_json(data, filename)
                
            # Send report to recipients
            if report_file:
                await ReportSchedulerService._send_report_email(
                    report_file,
                    report.name,
                    report.recipient_emails,
                    report.export_format,
                    filename
                )
                
            logger.info(f"Successfully processed report {report.id}")
            
        except Exception as e:
            logger.error(f"Error processing scheduled report {report.id}: {str(e)}")
    
    @staticmethod
    def _generate_csv(data: pd.DataFrame, filename: str) -> bytes:
        """Generate CSV report"""
        return data.to_csv(index=False).encode('utf-8')
    
    @staticmethod
    def _generate_excel(data: pd.DataFrame, filename: str) -> bytes:
        """Generate Excel report"""
        output = pd.ExcelWriter(f"{filename}.xlsx", engine='xlsxwriter')
        data.to_excel(output, index=False, sheet_name='Report')
        output.save()
        
        with open(f"{filename}.xlsx", 'rb') as f:
            return f.read()
    
    @staticmethod
    def _generate_json(data: pd.DataFrame, filename: str) -> bytes:
        """Generate JSON report"""
        return json.dumps(data.to_dict(orient='records'), default=str).encode('utf-8')
    
    @staticmethod
    async def _send_report_email(
        report_data: bytes,
        report_name: str,
        recipient_emails: List[str],
        export_format: AnalyticsExportFormat,
        filename: str
    ) -> bool:
        """Send report by email"""
        if not settings.SMTP_HOST or not settings.SMTP_PORT:
            logger.error("SMTP settings not configured")
            return False
            
        try:
            # Create email
            msg = MIMEMultipart()
            msg['Subject'] = f"Scheduled Report: {report_name}"
            msg['From'] = settings.SMTP_SENDER_EMAIL
            msg['To'] = ", ".join(recipient_emails)
            
            # Email body
            body = f"""
            <html>
            <body>
                <h2>Scheduled Report: {report_name}</h2>
                <p>Please find the scheduled report attached.</p>
                <p>This report was automatically generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.</p>
            </body>
            </html>
            """
            msg.attach(MIMEText(body, 'html'))
            
            # Add attachment
            file_extension = export_format.value
            attachment = MIMEApplication(report_data)
            attachment.add_header(
                'Content-Disposition', 
                'attachment', 
                filename=f"{filename}.{file_extension}"
            )
            msg.attach(attachment)
            
            # Send email
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending report email: {str(e)}")
            return False

    @staticmethod
    async def calculate_next_run_date(frequency: ReportScheduleFrequency, current_date: datetime = None) -> datetime:
        """Calculate the next run date based on frequency"""
        if current_date is None:
            current_date = datetime.now()
            
        if frequency == ReportScheduleFrequency.daily:
            return current_date + timedelta(days=1)
        elif frequency == ReportScheduleFrequency.weekly:
            return current_date + timedelta(weeks=1)
        elif frequency == ReportScheduleFrequency.monthly:
            # Add one month (approximately)
            if current_date.month == 12:
                return datetime(current_date.year + 1, 1, current_date.day)
            else:
                return datetime(current_date.year, current_date.month + 1, current_date.day)
        elif frequency == ReportScheduleFrequency.quarterly:
            # Add three months
            month = current_date.month
            year = current_date.year
            month += 3
            if month > 12:
                month -= 12
                year += 1
            return datetime(year, month, current_date.day)
        else:  # Annual
            return datetime(current_date.year + 1, current_date.month, current_date.day)
