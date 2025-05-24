from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.conversation_history import ConversationHistory, SenderType, ChannelType
from app.schemas.conversation_history import ConversationHistoryCreate, ConversationHistoryResponse
from uuid import UUID

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
