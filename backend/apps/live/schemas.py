import uuid
from typing import Optional
from datetime import datetime
from ninja import Schema

class LiveRoomDto(Schema):
    id: uuid.UUID
    hostId: uuid.UUID
    hostName: str
    hostImageUrl: Optional[str] = None
    liveKitRoomName: str
    title: str
    coverImageUrl: Optional[str] = None
    viewersCount: int = 0
    startedAt: datetime

class CreateLiveRoomRequest(Schema):
    title: str
    coverImageUrl: Optional[str] = None
