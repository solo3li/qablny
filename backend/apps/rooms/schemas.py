import uuid
from datetime import datetime
from typing import Optional, List
from ninja import Schema

class CreateVoiceRoomRequest(Schema):
    title: str
    category: Optional[str] = "chat"
    coverImageUrl: Optional[str] = None
    password: Optional[str] = None

class VoiceRoomSeatDto(Schema):
    seatIndex: int
    userId: Optional[uuid.UUID] = None
    userName: Optional[str] = None
    userAvatar: Optional[str] = None
    vipLevel: int = 0
    isLocked: bool = False
    isMuted: bool = False

class VoiceRoomListDto(Schema):
    id: uuid.UUID
    hostId: uuid.UUID
    hostName: str
    hostAvatar: Optional[str] = None
    hostVipLevel: int = 0
    liveKitRoomName: str
    title: str
    category: str
    coverImageUrl: Optional[str] = None
    hasPassword: bool = False
    listenersCount: int = 0
    speakersCount: int = 1
    isActive: bool = True
    createdAt: datetime

class VoiceRoomDetailDto(Schema):
    id: uuid.UUID
    hostId: uuid.UUID
    hostName: str
    hostAvatar: Optional[str] = None
    hostVipLevel: int = 0
    liveKitRoomName: str
    title: str
    category: str
    coverImageUrl: Optional[str] = None
    hasPassword: bool = False
    listenersCount: int = 0
    speakersCount: int = 1
    isActive: bool = True
    createdAt: datetime
    seats: List[VoiceRoomSeatDto]

class TakeSeatRequest(Schema):
    seatIndex: int

class MuteSeatRequest(Schema):
    isMuted: bool

class LockSeatRequest(Schema):
    isLocked: bool

class SendRoomChatRequest(Schema):
    message: str

class SendRoomGiftRequest(Schema):
    recipientId: uuid.UUID
    giftId: uuid.UUID

class RoomTokenResponseDto(Schema):
    token: str
    roomName: str
    serverUrl: str
    isSpeaker: bool
