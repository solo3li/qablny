import uuid
from typing import Optional, List
from datetime import datetime
from ninja import Schema
from pydantic import Field

class RegisterRequest(Schema):
    email: str
    password: str
    name: str
    age: Optional[int] = 18
    gender: Optional[int] = 0
    location: Optional[str] = None

class LoginRequest(Schema):
    email: str
    password: str

class RefreshRequest(Schema):
    refreshToken: str

class UserDto(Schema):
    id: uuid.UUID
    name: str
    bio: Optional[str] = None
    profileImageUrl: Optional[str] = None
    age: int
    gender: int
    location: Optional[str] = None
    interests: List[str] = []
    coins: int
    isVip: bool
    isOnline: bool
    lastSeen: str
    joinedAt: str
    totalMatches: int
    level: int = 1
    xp: int = 0
    vipLevel: int = 0

class AuthResponse(Schema):
    accessToken: str
    refreshToken: str
    expiresAt: datetime
    user: UserDto

class UpdateProfileRequest(Schema):
    name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    interests: Optional[List[str]] = None
    age: Optional[int] = None

class PushTokenRequest(Schema):
    token: str

class JoinAgencyRequest(Schema):
    inviteCode: str

class ReportRequest(Schema):
    reason: str

class BlockedUserDto(Schema):
    id: uuid.UUID
    name: str
    profileImageUrl: Optional[str] = None

class SearchUserDto(Schema):
    id: uuid.UUID
    name: str
    bio: Optional[str] = None
    profileImageUrl: Optional[str] = None
    age: int = 18
    gender: int = 0
    location: Optional[str] = None
    isOnline: bool = False
    relationshipStatus: str = "none"

class NotificationDto(Schema):
    id: uuid.UUID
    type: str
    title: str
    body: str
    isRead: bool
    imageUrl: Optional[str] = None
    actionId: Optional[str] = None
    createdAt: datetime
