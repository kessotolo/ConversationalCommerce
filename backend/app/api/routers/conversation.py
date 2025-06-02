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
from sqlalchemy import func, cast, Date, and_
from app.core.websocket.monitoring import connection_manager
import asyncio
from textblob import TextBlob
from fastapi.responses import StreamingResponse
import csv
from io import StringIO
from app.services.audit_service import create_audit_log

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
        # Sentiment and intent analysis for message_sent events
        payload = event.payload.copy() if event.payload else {}
        if event.event_type == "message_sent" and payload.get("content"):
            text = payload["content"]
            # Sentiment analysis
            blob = TextBlob(text)
            sentiment = {
                "polarity": blob.sentiment.polarity,
                "subjectivity": blob.sentiment.subjectivity,
                "label": "positive" if blob.sentiment.polarity > 0.2 else "negative" if blob.sentiment.polarity < -0.2 else "neutral"
            }
            payload["sentiment"] = sentiment
            # Simple intent classification (rule-based)
            lower = text.lower()
            if any(word in lower for word in ["buy", "order", "purchase"]):
                intent = "order"
            elif any(word in lower for word in ["price", "cost", "how much"]):
                intent = "inquiry"
            elif any(word in lower for word in ["problem", "issue", "complaint", "not working"]):
                intent = "complaint"
            elif any(word in lower for word in ["thanks", "thank you", "great", "love"]):
                intent = "feedback"
            else:
                intent = "other"
            payload["intent"] = intent

        db_event = ConversationEvent(
            conversation_id=event.conversation_id,
            user_id=event.user_id,
            event_type=event.event_type,
            payload=payload,
            tenant_id=event.tenant_id,
            metadata=event.metadata,
            created_at=None  # Let default apply
        )
        db.add(db_event)
        db.commit()
        db.refresh(db_event)

        # --- AuditLog integration for non-message events ---
        audit_event_types = {"conversation_started",
                             "user_joined", "user_left", "conversation_closed"}
        if db_event.event_type in audit_event_types:
            try:
                create_audit_log(
                    db=db,
                    user_id=db_event.user_id,
                    action=db_event.event_type,
                    resource_type="conversation",
                    resource_id=db_event.conversation_id or "unknown",
                    details=db_event.payload,
                    request=None  # Optionally pass request if available
                )
            except Exception as audit_exc:
                # Log but do not disrupt normal operation
                import logging
                logging.getLogger(__name__).warning(
                    f"Failed to create audit log for conversation event: {audit_exc}")

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


@router.get("/conversation-quality")
def get_conversation_quality(db: Session = Depends(get_db)):
    """
    Returns a quality score for each conversation based on:
    - Average response time (lower is better)
    - Average sentiment polarity (higher is better)
    - Resolution status (if available in payload/metadata)
    Also detects anomalies and broadcasts alerts via WebSocket.
    """
    try:
        conv_ids = db.query(ConversationEvent.conversation_id).filter(
            ConversationEvent.conversation_id != None).distinct().all()
        results = []
        now = datetime.utcnow()
        for (conv_id,) in conv_ids:
            events = db.query(ConversationEvent).filter(
                ConversationEvent.conversation_id == conv_id).all()
            if not events:
                continue
            sent_times = [
                e.created_at for e in events if e.event_type == 'message_sent']
            read_times = [
                e.created_at for e in events if e.event_type == 'message_read']
            response_times = []
            for sent in sent_times:
                after_reads = [r for r in read_times if r > sent]
                if after_reads:
                    response_times.append(
                        (after_reads[0] - sent).total_seconds())
            avg_response_time = sum(
                response_times) / len(response_times) if response_times else None
            sentiments = []
            for e in events:
                s = (e.payload or {}).get('sentiment', {})
                if isinstance(s, dict) and 'polarity' in s:
                    sentiments.append(s['polarity'])
            avg_sentiment = sum(sentiments) / \
                len(sentiments) if sentiments else None
            resolved = any((e.payload or {}).get('intent') == 'resolved' or (
                e.metadata or {}).get('resolved') for e in events)
            # Compute quality score
            score = 0
            if avg_response_time is not None:
                score += max(0, 1 - min(avg_response_time / 60, 1)) * 0.4
            if avg_sentiment is not None:
                score += ((avg_sentiment + 1) / 2) * 0.4
            if resolved:
                score += 0.2
            results.append({
                "conversation_id": str(conv_id),
                "avg_response_time_seconds": avg_response_time,
                "avg_sentiment": avg_sentiment,
                "resolved": resolved,
                "quality_score": round(score, 3)
            })
            # --- Anomaly detection and alerting ---
            # Only broadcast once per anomaly type per call
            tenant_id = str(
                events[0].tenant_id) if events and events[0].tenant_id else None
            if tenant_id:
                # 1. Slow response
                if avg_response_time is not None and avg_response_time > 120:
                    asyncio.create_task(connection_manager.broadcast_to_tenant(
                        tenant_id,
                        {
                            "type": "alert",
                            "alert_type": "slow_response",
                            "message": f"Conversation {conv_id} has high avg response time: {avg_response_time:.1f}s",
                            "severity": "high",
                            "conversation_id": str(conv_id),
                        }
                    ))
                # 2. Negative sentiment
                if avg_sentiment is not None and avg_sentiment < -0.5:
                    asyncio.create_task(connection_manager.broadcast_to_tenant(
                        tenant_id,
                        {
                            "type": "alert",
                            "alert_type": "negative_sentiment",
                            "message": f"Conversation {conv_id} has very negative sentiment: {avg_sentiment:.2f}",
                            "severity": "medium",
                            "conversation_id": str(conv_id),
                        }
                    ))
                # 3. Unresolved for > 1 day
                if not resolved:
                    last_event = max(events, key=lambda e: e.created_at)
                    if (now - last_event.created_at).total_seconds() > 86400:
                        asyncio.create_task(connection_manager.broadcast_to_tenant(
                            tenant_id,
                            {
                                "type": "alert",
                                "alert_type": "unresolved_long",
                                "message": f"Conversation {conv_id} unresolved for over 1 day.",
                                "severity": "medium",
                                "conversation_id": str(conv_id),
                            }
                        ))
        results.sort(key=lambda x: x["quality_score"], reverse=True)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to compute conversation quality: {str(e)}")


@router.get("/conversation-analytics/export")
def export_conversation_analytics_csv(db: Session = Depends(get_db)):
    """
    Export conversation analytics as CSV.
    """
    try:
        # Reuse analytics logic
        start = datetime.utcnow() - timedelta(days=30)
        end = datetime.utcnow()
        q = db.query(ConversationEvent).filter(
            ConversationEvent.created_at >= start,
            ConversationEvent.created_at <= end
        )
        events = q.all()
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "conversation_id", "user_id",
                        "event_type", "created_at", "payload"])
        for e in events:
            writer.writerow([
                str(e.id),
                str(e.conversation_id) if e.conversation_id else '',
                str(e.user_id) if e.user_id else '',
                e.event_type,
                e.created_at.isoformat(),
                str(e.payload)
            ])
        output.seek(0)
        return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=conversation_analytics.csv"})
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to export analytics: {str(e)}")


@router.get("/conversation-quality/export")
def export_conversation_quality_csv(db: Session = Depends(get_db)):
    """
    Export conversation quality leaderboard as CSV.
    """
    try:
        # Reuse quality logic
        conv_ids = db.query(ConversationEvent.conversation_id).filter(
            ConversationEvent.conversation_id != None).distinct().all()
        results = []
        for (conv_id,) in conv_ids:
            events = db.query(ConversationEvent).filter(
                ConversationEvent.conversation_id == conv_id).all()
            if not events:
                continue
            sent_times = [
                e.created_at for e in events if e.event_type == 'message_sent']
            read_times = [
                e.created_at for e in events if e.event_type == 'message_read']
            response_times = []
            for sent in sent_times:
                after_reads = [r for r in read_times if r > sent]
                if after_reads:
                    response_times.append(
                        (after_reads[0] - sent).total_seconds())
            avg_response_time = sum(
                response_times) / len(response_times) if response_times else None
            sentiments = []
            for e in events:
                s = (e.payload or {}).get('sentiment', {})
                if isinstance(s, dict) and 'polarity' in s:
                    sentiments.append(s['polarity'])
            avg_sentiment = sum(sentiments) / \
                len(sentiments) if sentiments else None
            resolved = any((e.payload or {}).get('intent') == 'resolved' or (
                e.metadata or {}).get('resolved') for e in events)
            score = 0
            if avg_response_time is not None:
                score += max(0, 1 - min(avg_response_time / 60, 1)) * 0.4
            if avg_sentiment is not None:
                score += ((avg_sentiment + 1) / 2) * 0.4
            if resolved:
                score += 0.2
            results.append({
                "conversation_id": str(conv_id),
                "avg_response_time_seconds": avg_response_time,
                "avg_sentiment": avg_sentiment,
                "resolved": resolved,
                "quality_score": round(score, 3)
            })
        results.sort(key=lambda x: x["quality_score"], reverse=True)
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["conversation_id", "quality_score",
                        "avg_response_time_seconds", "avg_sentiment", "resolved"])
        for row in results:
            writer.writerow([
                row["conversation_id"],
                row["quality_score"],
                row["avg_response_time_seconds"] if row["avg_response_time_seconds"] is not None else '',
                row["avg_sentiment"] if row["avg_sentiment"] is not None else '',
                'yes' if row["resolved"] else 'no'
            ])
        output.seek(0)
        return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=conversation_quality.csv"})
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to export quality leaderboard: {str(e)}")
