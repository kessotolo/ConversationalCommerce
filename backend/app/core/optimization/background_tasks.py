import logging
from typing import Any, Dict, List, Optional, Union, Callable
from datetime import datetime
import asyncio
import traceback
import uuid

from celery import Task
from pydantic import BaseModel, Field

from backend.app.core.celery_app import celery_app
from backend.app.core.notifications.notification_service import (
    notification_service, 
    Notification, 
    NotificationChannel, 
    NotificationPriority
)

logger = logging.getLogger(__name__)


class TaskStatus(str):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AdminTaskRecord(BaseModel):
    """Model for tracking administrative background tasks"""
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    status: str = TaskStatus.PENDING
    created_by: str  # Admin user ID
    created_at: datetime = Field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: int = 0  # 0-100 percent
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    notify_on_completion: bool = False
    notify_on_failure: bool = True


class AdminBackgroundTaskManager:
    """
    Manager for handling intensive background operations for the admin system.
    Uses Celery for task processing but adds admin-specific tracking and notifications.
    """
    
    _task_store: Dict[str, AdminTaskRecord] = {}
    
    @classmethod
    def register_admin_task(
        cls,
        name: str,
        description: str,
        created_by: str,
        metadata: Dict[str, Any] = None,
        notify_on_completion: bool = False,
        notify_on_failure: bool = True
    ) -> AdminTaskRecord:
        """
        Register a new admin task for tracking
        
        Args:
            name: Task name
            description: Task description
            created_by: Admin user ID
            metadata: Additional task metadata
            notify_on_completion: Whether to notify on completion
            notify_on_failure: Whether to notify on failure
            
        Returns:
            Admin task record
        """
        task_record = AdminTaskRecord(
            name=name,
            description=description,
            created_by=created_by,
            metadata=metadata or {},
            notify_on_completion=notify_on_completion,
            notify_on_failure=notify_on_failure
        )
        
        cls._task_store[task_record.task_id] = task_record
        logger.info(f"Registered admin task: {task_record.task_id} - {name}")
        
        return task_record
    
    @classmethod
    def get_task(cls, task_id: str) -> Optional[AdminTaskRecord]:
        """
        Get task record by ID
        
        Args:
            task_id: Task ID
            
        Returns:
            Admin task record or None if not found
        """
        return cls._task_store.get(task_id)
    
    @classmethod
    def get_tasks_by_user(cls, user_id: str) -> List[AdminTaskRecord]:
        """
        Get all tasks created by a specific admin user
        
        Args:
            user_id: Admin user ID
            
        Returns:
            List of admin task records
        """
        return [task for task in cls._task_store.values() if task.created_by == user_id]
    
    @classmethod
    def update_task_status(
        cls,
        task_id: str,
        status: str,
        progress: int = None,
        result: Dict[str, Any] = None,
        error: str = None
    ) -> Optional[AdminTaskRecord]:
        """
        Update task status
        
        Args:
            task_id: Task ID
            status: New status
            progress: Optional progress percentage (0-100)
            result: Optional result data
            error: Optional error message
            
        Returns:
            Updated admin task record or None if not found
        """
        task = cls.get_task(task_id)
        if not task:
            logger.error(f"Task not found: {task_id}")
            return None
        
        task.status = status
        
        if progress is not None:
            task.progress = min(100, max(0, progress))
            
        if status == TaskStatus.RUNNING and not task.started_at:
            task.started_at = datetime.now()
            
        if status == TaskStatus.COMPLETED:
            task.completed_at = datetime.now()
            if result:
                task.result = result
                
        if status == TaskStatus.FAILED:
            task.completed_at = datetime.now()
            if error:
                task.error = error
        
        # Store updated task
        cls._task_store[task_id] = task
        
        # Send notifications if needed
        cls._send_task_notifications(task)
        
        return task
    
    @classmethod
    async def _send_task_notifications(cls, task: AdminTaskRecord) -> None:
        """
        Send notifications about task status
        
        Args:
            task: Admin task record
        """
        if task.status == TaskStatus.COMPLETED and task.notify_on_completion:
            await cls._send_task_completed_notification(task)
        elif task.status == TaskStatus.FAILED and task.notify_on_failure:
            await cls._send_task_failed_notification(task)
    
    @classmethod
    async def _send_task_completed_notification(cls, task: AdminTaskRecord) -> None:
        """
        Send task completion notification
        
        Args:
            task: Admin task record
        """
        notification = Notification(
            id=str(uuid.uuid4()),
            tenant_id="admin",  # Special case for admin notifications
            user_id=task.created_by,
            title=f"Admin Task Completed: {task.name}",
            message=f"Your admin task has completed successfully.\n\nDescription: {task.description}",
            priority=NotificationPriority.MEDIUM,
            channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            metadata={
                "task_id": task.task_id,
                "execution_time": (task.completed_at - task.started_at).total_seconds() if task.started_at else None,
                "result_summary": str(task.result)[:100] if task.result else None
            }
        )
        
        await notification_service.send_notification(notification)
    
    @classmethod
    async def _send_task_failed_notification(cls, task: AdminTaskRecord) -> None:
        """
        Send task failure notification
        
        Args:
            task: Admin task record
        """
        notification = Notification(
            id=str(uuid.uuid4()),
            tenant_id="admin",  # Special case for admin notifications
            user_id=task.created_by,
            title=f"Admin Task Failed: {task.name}",
            message=(
                f"Your admin task has failed.\n\n"
                f"Description: {task.description}\n\n"
                f"Error: {task.error}"
            ),
            priority=NotificationPriority.HIGH,
            channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            metadata={
                "task_id": task.task_id,
                "execution_time": (task.completed_at - task.started_at).total_seconds() if task.started_at else None,
            }
        )
        
        await notification_service.send_notification(notification)


class AdminBackgroundTask(Task):
    """
    Celery task class for admin background tasks with tracking and notifications
    """
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success"""
        admin_task_id = kwargs.get("admin_task_id")
        if admin_task_id:
            AdminBackgroundTaskManager.update_task_status(
                admin_task_id,
                status=TaskStatus.COMPLETED,
                progress=100,
                result=retval
            )
        return super().on_success(retval, task_id, args, kwargs)
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure"""
        admin_task_id = kwargs.get("admin_task_id")
        if admin_task_id:
            error_msg = str(exc) if exc else "Unknown error"
            if einfo and einfo.traceback:
                error_msg = f"{error_msg}\n\n{einfo.traceback}"
                
            AdminBackgroundTaskManager.update_task_status(
                admin_task_id,
                status=TaskStatus.FAILED,
                error=error_msg
            )
        return super().on_failure(exc, task_id, args, kwargs, einfo)


# Example admin background tasks

@celery_app.task(base=AdminBackgroundTask, bind=True)
def run_cross_tenant_report(self, report_type: str, parameters: Dict[str, Any], admin_task_id: str = None):
    """
    Run a cross-tenant report as a background task
    
    Args:
        report_type: Report type identifier
        parameters: Report parameters
        admin_task_id: Admin task ID for tracking
    
    Returns:
        Report results
    """
    # Update task status to running
    AdminBackgroundTaskManager.update_task_status(
        admin_task_id,
        status=TaskStatus.RUNNING,
        progress=10
    )
    
    try:
        # Simulate report generation
        import time
        time.sleep(5)
        
        # Update progress
        AdminBackgroundTaskManager.update_task_status(
            admin_task_id,
            status=TaskStatus.RUNNING,
            progress=50
        )
        
        # Simulate more processing
        time.sleep(5)
        
        # Create sample report results
        results = {
            "report_type": report_type,
            "parameters": parameters,
            "generated_at": datetime.now().isoformat(),
            "data": {
                "summary": {
                    "total_records": 1000,
                    "filtered_records": 500,
                    "metrics": {
                        "average": 42.5,
                        "median": 37.8,
                        "max": 100.0
                    }
                },
                # Additional report data would go here
            }
        }
        
        return results
        
    except Exception as e:
        logger.exception("Error running cross-tenant report")
        raise


@celery_app.task(base=AdminBackgroundTask, bind=True)
def process_bulk_tenant_update(self, tenant_ids: List[str], update_data: Dict[str, Any], admin_task_id: str = None):
    """
    Process bulk update across multiple tenants
    
    Args:
        tenant_ids: List of tenant IDs
        update_data: Data to update
        admin_task_id: Admin task ID for tracking
    
    Returns:
        Update results
    """
    # Update task status to running
    AdminBackgroundTaskManager.update_task_status(
        admin_task_id,
        status=TaskStatus.RUNNING,
        progress=0
    )
    
    try:
        results = {
            "successful": [],
            "failed": []
        }
        
        # Process each tenant
        for i, tenant_id in enumerate(tenant_ids):
            try:
                # Simulate tenant update
                import time
                time.sleep(0.5)
                
                # Add to successful list
                results["successful"].append(tenant_id)
                
                # Update progress
                progress = int((i + 1) / len(tenant_ids) * 100)
                AdminBackgroundTaskManager.update_task_status(
                    admin_task_id,
                    status=TaskStatus.RUNNING,
                    progress=progress
                )
                
            except Exception as e:
                # Log the error
                logger.error(f"Error updating tenant {tenant_id}: {str(e)}")
                
                # Add to failed list with error message
                results["failed"].append({
                    "tenant_id": tenant_id,
                    "error": str(e)
                })
        
        return results
        
    except Exception as e:
        logger.exception("Error processing bulk tenant update")
        raise


# Create singleton instance
admin_background_tasks = AdminBackgroundTaskManager()
