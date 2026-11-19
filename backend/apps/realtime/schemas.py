import uuid
from typing import Optional
from ninja import Schema

class RealtimeTokenDto(Schema):
    token: str
    wsUrl: str
    channel: str

class InitiateCallRequest(Schema):
    friendId: uuid.UUID
    callType: str = "video"  # "video" or "voice"

class AcceptCallRequest(Schema):
    callerId: uuid.UUID
    roomName: str

class DeclineCallRequest(Schema):
    callerId: uuid.UUID

class EndCallRequest(Schema):
    friendId: uuid.UUID
    roomName: str
    callType: str = "video"

class FriendActionRequest(Schema):
    friendId: uuid.UUID
