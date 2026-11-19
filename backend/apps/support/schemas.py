import uuid
from typing import Optional
from datetime import datetime
from ninja import Schema

class CreateTicketRequest(Schema):
    subject: str
    message: Optional[str] = None
    category: Optional[str] = None

class SupportTicketDto(Schema):
    id: uuid.UUID
    userId: uuid.UUID
    subject: str
    status: str
    createdAt: datetime
    updatedAt: datetime

class SupportMessageDto(Schema):
    id: uuid.UUID
    ticketId: uuid.UUID
    senderId: uuid.UUID
    isAdmin: bool
    type: int
    content: Optional[str] = None
    durationSeconds: Optional[int] = None
    mediaUrl: Optional[str] = None
    createdAt: datetime

class SendSupportMessageRequest(Schema):
    isAdmin: bool = False
    type: int = 0
    content: Optional[str] = None
    message: Optional[str] = None
    durationSeconds: Optional[int] = None
    mediaUrl: Optional[str] = None
