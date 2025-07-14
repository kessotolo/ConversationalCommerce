from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, asc
import pandas as pd
import json

from app.app.models.analytics import AnalyticsEvent, AnalyticsMetric, AnalyticsReport
from app.app.schemas.analytics import AnalyticsEventCreate, AnalyticsMetricCreate, AnalyticsReportCreate, AnalyticsQuery
from app.app.schemas.analytics import AnalyticsMetricUpdate, AnalyticsReportUpdate
from app.app.core.security import get_tenant_id_from_context


class AnalyticsRepository:
    """Repository for analytics operations"""

    @staticmethod
    async def create_event(db: Session, event: AnalyticsEventCreate, tenant_id: int) -> AnalyticsEvent:
        """Create a new analytics event"""
        db_event = AnalyticsEvent(**event.dict(), tenant_id=tenant_id)
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        return db_event

    @staticmethod
    async def batch_create_events(db: Session, events: List[AnalyticsEventCreate], tenant_id: int) -> List[AnalyticsEvent]:
        """Create multiple analytics events at once"""
        db_events = [AnalyticsEvent(**event.dict(), tenant_id=tenant_id) for event in events]
        db.add_all(db_events)
        db.commit()
        for event in db_events:
            db.refresh(event)
        return db_events

    @staticmethod
    async def get_events(
        db: Session, 
        tenant_id: int,
        skip: int = 0, 
        limit: int = 100,
        event_type: Optional[str] = None,
        event_category: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[AnalyticsEvent]:
        """Get analytics events with optional filters"""
        query = db.query(AnalyticsEvent).filter(AnalyticsEvent.tenant_id == tenant_id)
        
        if event_type:
            query = query.filter(AnalyticsEvent.event_type == event_type)
        
        if event_category:
            query = query.filter(AnalyticsEvent.event_category == event_category)
        
        if start_date:
            query = query.filter(AnalyticsEvent.created_at >= start_date)
        
        if end_date:
            query = query.filter(AnalyticsEvent.created_at <= end_date)
        
        return query.order_by(desc(AnalyticsEvent.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    async def create_metric(db: Session, metric: AnalyticsMetricCreate, tenant_id: int) -> AnalyticsMetric:
        """Create a new analytics metric"""
        db_metric = AnalyticsMetric(**metric.dict(), tenant_id=tenant_id)
        db.add(db_metric)
        db.commit()
        db.refresh(db_metric)
        return db_metric

    @staticmethod
    async def batch_create_metrics(db: Session, metrics: List[AnalyticsMetricCreate], tenant_id: int) -> List[AnalyticsMetric]:
        """Create multiple analytics metrics at once"""
        db_metrics = [AnalyticsMetric(**metric.dict(), tenant_id=tenant_id) for metric in metrics]
        db.add_all(db_metrics)
        db.commit()
        for metric in db_metrics:
            db.refresh(metric)
        return db_metrics

    @staticmethod
    async def update_metric(db: Session, metric_id: int, update_data: AnalyticsMetricUpdate, tenant_id: int) -> Optional[AnalyticsMetric]:
        """Update an existing metric"""
        db_metric = db.query(AnalyticsMetric).filter(
            AnalyticsMetric.id == metric_id,
            AnalyticsMetric.tenant_id == tenant_id
        ).first()
        
        if not db_metric:
            return None
        
        update_dict = update_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(db_metric, key, value)
        
        db.add(db_metric)
        db.commit()
        db.refresh(db_metric)
        return db_metric

    @staticmethod
    async def get_metrics(
        db: Session, 
        tenant_id: int,
        metric_keys: Optional[List[str]] = None,
        metric_category: Optional[str] = None,
        dimension: Optional[str] = None,
        dimension_value: Optional[str] = None,
        time_period: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        is_final: Optional[bool] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[AnalyticsMetric]:
        """Get analytics metrics with optional filters"""
        query = db.query(AnalyticsMetric).filter(AnalyticsMetric.tenant_id == tenant_id)
        
        if metric_keys:
            query = query.filter(AnalyticsMetric.metric_key.in_(metric_keys))
        
        if metric_category:
            query = query.filter(AnalyticsMetric.metric_category == metric_category)
        
        if dimension:
            query = query.filter(AnalyticsMetric.dimension == dimension)
        
        if dimension_value:
            query = query.filter(AnalyticsMetric.dimension_value == dimension_value)
        
        if time_period:
            query = query.filter(AnalyticsMetric.time_period == time_period)
        
        if start_date:
            query = query.filter(AnalyticsMetric.start_date >= start_date)
        
        if end_date:
            query = query.filter(AnalyticsMetric.end_date <= end_date)
        
        if is_final is not None:
            query = query.filter(AnalyticsMetric.is_final == is_final)
        
        return query.order_by(desc(AnalyticsMetric.end_date)).offset(skip).limit(limit).all()

    @staticmethod
    async def create_report(db: Session, report: AnalyticsReportCreate, tenant_id: int, user_id: int) -> AnalyticsReport:
        """Create a new analytics report"""
        db_report = AnalyticsReport(**report.dict(), tenant_id=tenant_id, created_by=user_id)
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        return db_report

    @staticmethod
    async def update_report(db: Session, report_id: int, update_data: AnalyticsReportUpdate, tenant_id: int) -> Optional[AnalyticsReport]:
        """Update an existing report"""
        db_report = db.query(AnalyticsReport).filter(
            AnalyticsReport.id == report_id,
            AnalyticsReport.tenant_id == tenant_id
        ).first()
        
        if not db_report:
            return None
        
        update_dict = update_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(db_report, key, value)
        
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        return db_report

    @staticmethod
    async def get_reports(
        db: Session, 
        tenant_id: int,
        report_type: Optional[str] = None,
        created_by: Optional[int] = None,
        is_scheduled: Optional[bool] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[AnalyticsReport]:
        """Get analytics reports with optional filters"""
        query = db.query(AnalyticsReport).filter(AnalyticsReport.tenant_id == tenant_id)
        
        if report_type:
            query = query.filter(AnalyticsReport.report_type == report_type)
        
        if created_by:
            query = query.filter(AnalyticsReport.created_by == created_by)
        
        if is_scheduled is not None:
            query = query.filter(AnalyticsReport.is_scheduled == is_scheduled)
        
        return query.order_by(desc(AnalyticsReport.updated_at)).offset(skip).limit(limit).all()

    @staticmethod
    async def get_report_by_id(db: Session, report_id: int, tenant_id: int) -> Optional[AnalyticsReport]:
        """Get report by ID"""
        return db.query(AnalyticsReport).filter(
            AnalyticsReport.id == report_id,
            AnalyticsReport.tenant_id == tenant_id
        ).first()

    @staticmethod
    async def delete_report(db: Session, report_id: int, tenant_id: int) -> bool:
        """Delete a report"""
        db_report = db.query(AnalyticsReport).filter(
            AnalyticsReport.id == report_id,
            AnalyticsReport.tenant_id == tenant_id
        ).first()
        
        if not db_report:
            return False
        
        db.delete(db_report)
        db.commit()
        return True

    @staticmethod
    async def aggregate_metrics(
        db: Session, 
        query: AnalyticsQuery, 
        tenant_id: int
    ) -> pd.DataFrame:
        """
        Aggregate metrics based on query parameters
        Returns a pandas DataFrame with the aggregated data
        """
        # Get raw events data
        raw_query = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.tenant_id == tenant_id,
            AnalyticsEvent.created_at >= query.date_range.start_date,
            AnalyticsEvent.created_at <= query.date_range.end_date
        )
        
        # Apply filters if specified
        if query.filters:
            for field, value in query.filters.items():
                if field == 'event_type' and isinstance(value, list):
                    raw_query = raw_query.filter(AnalyticsEvent.event_type.in_(value))
                elif field == 'event_category' and isinstance(value, list):
                    raw_query = raw_query.filter(AnalyticsEvent.event_category.in_(value))
                elif field == 'event_name' and isinstance(value, list):
                    raw_query = raw_query.filter(AnalyticsEvent.event_name.in_(value))
                elif field == 'user_id' and isinstance(value, list):
                    raw_query = raw_query.filter(AnalyticsEvent.user_id.in_(value))
                elif field == 'event_data' and isinstance(value, dict):
                    for data_key, data_value in value.items():
                        # JSON field filtering using PostgreSQL json operators
                        # This assumes PostgreSQL database
                        raw_query = raw_query.filter(
                            AnalyticsEvent.event_data[data_key].astext == str(data_value)
                        )
        
        # Execute query and convert to pandas DataFrame for easier manipulation
        results = raw_query.all()
        
        if not results:
            # Return empty DataFrame with expected columns
            columns = query.metrics + query.dimensions if query.dimensions else query.metrics
            return pd.DataFrame(columns=columns)
        
        # Convert SQLAlchemy objects to dicts
        rows = []
        for event in results:
            event_dict = {
                "id": event.id,
                "event_type": event.event_type,
                "event_category": event.event_category,
                "event_name": event.event_name,
                "event_value": event.event_value if event.event_value is not None else 0,
                "created_at": event.created_at,
                "user_id": event.user_id,
                "session_id": event.session_id
            }
            
            # Extract event_data fields
            if event.event_data:
                for key, value in event.event_data.items():
                    event_dict[f"data_{key}"] = value
            
            rows.append(event_dict)
        
        df = pd.DataFrame(rows)
        
        # Apply dimensions for grouping
        group_by = query.dimensions if query.dimensions else []
        
        if not group_by and not query.metrics:
            return df
        
        # Calculate metrics
        aggregations = {}
        for metric in query.metrics:
            if metric == 'count':
                aggregations[metric] = ('id', 'count')
            elif metric == 'sum_value':
                aggregations[metric] = ('event_value', 'sum')
            elif metric == 'avg_value':
                aggregations[metric] = ('event_value', 'mean')
            elif metric == 'min_value':
                aggregations[metric] = ('event_value', 'min')
            elif metric == 'max_value':
                aggregations[metric] = ('event_value', 'max')
            elif metric.startswith('count_distinct_'):
                field = metric.replace('count_distinct_', '')
                if field in df.columns:
                    aggregations[metric] = (field, lambda x: x.nunique())
        
        # Group and aggregate
        if group_by:
            result_df = df.groupby(group_by).agg(
                **{k: pd.NamedAgg(column=v[0], aggfunc=v[1]) for k, v in aggregations.items()}
            ).reset_index()
        else:
            result_df = pd.DataFrame({
                k: [df[v[0]].agg(v[1])] for k, v in aggregations.items()
            })
        
        # Apply sorting if specified
        if query.sort_by:
            if query.sort_by in result_df.columns:
                result_df = result_df.sort_values(by=query.sort_by, ascending=not query.sort_desc)
        
        # Apply limit and offset
        if query.offset:
            result_df = result_df.iloc[query.offset:]
            
        if query.limit:
            result_df = result_df.iloc[:query.limit]
        
        return result_df

    @staticmethod
    async def export_analytics_data(
        df: pd.DataFrame, 
        export_format: str,
        include_headers: bool = True
    ) -> Tuple[bytes, str]:
        """
        Export analytics data in specified format
        Returns tuple of (data_bytes, mime_type)
        """
        if export_format == 'csv':
            output = df.to_csv(index=False, header=include_headers).encode('utf-8')
            mime_type = 'text/csv'
        elif export_format == 'excel':
            # Use BytesIO for Excel output
            import io
            output_io = io.BytesIO()
            df.to_excel(output_io, index=False, header=include_headers)
            output = output_io.getvalue()
            mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        elif export_format == 'json':
            output = df.to_json(orient='records').encode('utf-8')
            mime_type = 'application/json'
        else:
            # Default to CSV
            output = df.to_csv(index=False, header=include_headers).encode('utf-8')
            mime_type = 'text/csv'
            
        return output, mime_type
