from ninja import Schema
from typing import List, Optional

class UpdateLocationRequest(Schema):
    latitude: float
    longitude: float

class UpdateLocationResponse(Schema):
    success: bool
    latitude: float
    longitude: float
    ghostMode: str
    isStored: bool
    message: Optional[str] = None

class UserLocationResponse(Schema):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ghostMode: str
    updatedAt: Optional[str] = None

class GhostModeRequest(Schema):
    ghostMode: Optional[str] = None  # "public", "friends", "ghost"
    toggle: Optional[bool] = False

class GhostModeResponse(Schema):
    success: bool
    ghostMode: str
    isGhostActive: bool
    message: Optional[str] = None

class NearbyUserDto(Schema):
    id: str
    name: str
    bio: str
    profileImageUrl: str
    age: int
    gender: int
    isOnline: bool
    lastSeen: str
    distance: float
    distanceText: str
    latitude: float
    longitude: float
    isFriend: bool
    streakDays: int
    hasRecentSnap: bool
    recentSnapPreview: Optional[str] = None
    ghostMode: str

class NearbyUsersResponse(Schema):
    users: List[NearbyUserDto]
    count: int
    radius: float
    myGhostMode: str
