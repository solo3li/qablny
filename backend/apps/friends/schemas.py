import uuid
from typing import Optional, List
from datetime import datetime
from ninja import Schema

class FriendDto(Schema):
    id: uuid.UUID
    name: str
    profileImageUrl: Optional[str] = None
    gender: int
    location: Optional[str] = None
    age: int
    isOnline: bool
    lastSeen: str
    unreadCount: int = 0
    lastMessage: Optional[str] = None
    streakCount: int = 0
    streakHoursLeft: Optional[int] = None
    isStreakExpiringSoon: bool = False
    hasSentStreakToday: bool = False
    isStreakBroken: bool = False
    streakId: Optional[uuid.UUID] = None

class FriendRequestDto(Schema):
    id: uuid.UUID
    senderId: uuid.UUID
    senderName: str
    senderImage: Optional[str] = None
    senderBio: Optional[str] = None
    createdAt: str

class MessageDto(Schema):
    id: uuid.UUID
    conversationId: uuid.UUID
    senderId: uuid.UUID
    receiverId: uuid.UUID
    type: int
    content: Optional[str] = None
    translation: Optional[str] = None
    durationSeconds: Optional[int] = None
    mediaUrl: Optional[str] = None
    locationName: Optional[str] = None
    locationLat: Optional[float] = None
    locationLng: Optional[float] = None
    isRead: bool
    createdAt: datetime
    isMe: bool

class SendMessageRequest(Schema):
    type: int = 0
    content: Optional[str] = None
    durationSeconds: Optional[int] = None
    mediaUrl: Optional[str] = None
    locationName: Optional[str] = None
    locationLat: Optional[float] = None
    locationLng: Optional[float] = None

class ConversationDto(Schema):
    id: uuid.UUID
    friend: FriendDto
    lastMessage: Optional[MessageDto] = None
    unreadCount: int = 0

class StreakDto(Schema):
    id: uuid.UUID
    friendId: uuid.UUID
    friendName: str
    friendImage: Optional[str] = None
    streakCount: int
    expiresAt: Optional[str] = None
    hoursLeft: Optional[int] = None
    isExpiringSoon: bool = False
    isBroken: bool = False
    hasSentToday: bool = False
    canRestore: bool = False
    restoreCost: int = 50

class SendStreakRequest(Schema):
    friendIds: List[uuid.UUID]
    mediaUrl: str
    mediaType: str = "image"
    caption: Optional[str] = None
    durationSeconds: int = 10

class SendStreakResponse(Schema):
    sentCount: int
    streaks: List[StreakDto]

class RestoreStreakResponse(Schema):
    success: bool
    streak: StreakDto
    coinsRemaining: int

class OpenSnapResponse(Schema):
    messageId: uuid.UUID
    isRead: bool
    openedAt: str

