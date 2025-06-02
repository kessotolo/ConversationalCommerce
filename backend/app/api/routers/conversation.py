from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.conversation_history import ConversationHistory, SenderType, ChannelType
from app.schemas.conversation_history import ConversationHistoryCreate, ConversationHistoryResponse
from uuid import UUID
from app.models.conversation_event import ConversationEvent
from app.schemas.conversation_event import ConversationEventCreate, ConversationEventResponse
from fastapi import status
from datetime import datetime, timedelta
from sqlalchemy import func, cast, Date
from app.core.websocket.monitoring import connection_manager
import asyncio

router = APIRouter()


@router.get("/conversations", response_model=List[ConversationHistoryResponse])
def get_conversations(db: Session = Depends(get_db)):
    conversations = db.query(ConversationHistory).order_by(
        ConversationHistory.timestamp.desc()).all()
    return conversations


@router.post("/conversations", response_model=ConversationHistoryResponse)
def create_conversation(convo: ConversationHistoryCreate, db: Session = Depends(get_db)):
    conversation = ConversationHistory(
        order_id=convo.order_id,
        message=convo.message,
        sender_type=SenderType(convo.sender_type),
        channel=ChannelType(convo.channel),
        timestamp=convo.timestamp or None
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("/conversation-events", response_model=List[ConversationEventResponse])
def get_conversation_events(db: Session = Depends(get_db)):
    events = db.query(ConversationEvent).order_by(
        ConversationEvent.created_at.desc()).all()
    return events


@router.post("/conversation-events", response_model=ConversationEventResponse, status_code=status.HTTP_201_CREATED)
def log_conversation_event(event: ConversationEventCreate, db: Session = Depends(get_db)):
    try:
        db_event = ConversationEvent(
            conversation_id=event.conversation_id,
            user_id=event.user_id,
            event_type=event.event_type,
            payload=event.payload,
            tenant_id=event.tenant_id,
            metadata=event.metadata,
            created_at=None  # Let default apply
        )
        db.add(db_event)
        db.commit()
        db.refresh(db_event)

        # Broadcast key events to tenant admins in real time
        key_types = {"message_sent", "message_read",
                     "product_clicked", "order_placed"}
        if db_event.event_type in key_types:
            asyncio.create_task(connection_manager.broadcast_to_tenant(
                str(db_event.tenant_id),
                {
                    "type": "conversation_event",
                    "event": {
                        "id": str(db_event.id),
                        "conversation_id": str(db_event.conversation_id) if db_event.conversation_id else None,
                        "user_id": str(db_event.user_id) if db_event.user_id else None,
                        "event_type": db_event.event_type,
                        "payload": db_event.payload,
                        "created_at": db_event.created_at.isoformat(),
                        "metadata": db_event.metadata,
                    }
                }
            ))

        return db_event
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to log event: {str(e)}")


@router.get("/conversation-analytics")
def get_conversation_analytics(
    db: Session = Depends(get_db),
    start_date: str = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date (YYYY-MM-DD)"),
    event_type: str = Query(None, description="Filter by event type")
):
    try:
        # Parse dates
        if start_date:
            start = datetime.strptime(start_date, "%Y-%m-%d")
        else:
            start = datetime.utcnow() - timedelta(days=30)
        if end_date:
            end = datetime.strptime(end_date, "%Y-%m-%d")
        else:
            end = datetime.utcnow()

        q = db.query(ConversationEvent).filter(
            ConversationEvent.created_at >= start,
            ConversationEvent.created_at <= end
        )
        if event_type:
            q = q.filter(ConversationEvent.event_type == event_type)

        total_count = q.count()

        # Count by event type
        counts_by_type = (
            db.query(ConversationEvent.event_type,
                     func.count(ConversationEvent.id))
            .filter(ConversationEvent.created_at >= start, ConversationEvent.created_at <= end)
            .group_by(ConversationEvent.event_type)
            .all()
        )
        counts_by_type = {k: v for k, v in counts_by_type}

        # Count by day (last 30 days)
        counts_by_day = (
            db.query(cast(ConversationEvent.created_at, Date),
                     func.count(ConversationEvent.id))
            .filter(ConversationEvent.created_at >= start, ConversationEvent.created_at <= end)
            .group_by(cast(ConversationEvent.created_at, Date))
            .order_by(cast(ConversationEvent.created_at, Date))
            .all()
        )
        counts_by_day = [{"date": str(date), "count": count}
                         for date, count in counts_by_day]

        # Average response time (if message_sent and message_read events exist)
        avg_response_time = None
        sent_events = (
            db.query(ConversationEvent)
            .filter(ConversationEvent.event_type == 'message_sent', ConversationEvent.created_at >= start, ConversationEvent.created_at <= end)
            .order_by(ConversationEvent.conversation_id, ConversationEvent.created_at)
            .all()
        )
        read_events = (
            db.query(ConversationEvent)
            .filter(ConversationEvent.event_type == 'message_read', ConversationEvent.created_at >= start, ConversationEvent.created_at <= end)
            .order_by(ConversationEvent.conversation_id, ConversationEvent.created_at)
            .all()
        )
        if sent_events and read_events:
            # Map conversation_id to sent/read times
            sent_map = {}
            for e in sent_events:
                sent_map.setdefault(e.conversation_id, []).append(e.created_at)
            read_map = {}
            for e in read_events:
                read_map.setdefault(e.conversation_id, []).append(e.created_at)
            # Compute response times (first read after each sent)
            response_times = []
            for conv_id, sent_times in sent_map.items():
                reads = read_map.get(conv_id, [])
                for sent_time in sent_times:
                    after_reads = [r for r in reads if r > sent_time]
                    if after_reads:
                        response_times.append(
                            (after_reads[0] - sent_time).total_seconds())
            if response_times:
                avg_response_time = sum(response_times) / len(response_times)

        return {
            "total_count": total_count,
            "counts_by_type": counts_by_type,
            "counts_by_day": counts_by_day,
            "avg_response_time_seconds": avg_response_time,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to aggregate analytics: {str(e)}")
