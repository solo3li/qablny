import uuid
from typing import Optional, List
from ninja import Schema

class JoinQueueRequest(Schema):
    genderPref: Optional[int] = None
    preferredGender: Optional[int] = None
    minAge: int = 18
    maxAge: int = 60
    callType: Optional[str] = "video"

class MatchedUserDto(Schema):
    id: uuid.UUID
    name: str
    profileImageUrl: Optional[str] = None
    age: int
    location: Optional[str] = None
    gender: int
    interests: List[str] = []
    isVip: bool = False

class MatchFoundDto(Schema):
    roomName: str
    liveKitToken: str
    liveKitServerUrl: str
    matchedUser: MatchedUserDto

class LiveKitTokenDto(Schema):
    token: str
    roomName: str
    serverUrl: str

class BoostStatusDto(Schema):
    isBoosted: bool
    expiresInSeconds: int
    coinsRemaining: int
    isVip: bool

class BoostResponseDto(Schema):
    status: str
    message: str
    expiresInSeconds: int
    coinsRemaining: int
    isVip: bool
