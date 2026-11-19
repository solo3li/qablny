import uuid
import time
import redis
from django.conf import settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from ninja import Router
from apps.realtime.schemas import (
    RealtimeTokenDto, InitiateCallRequest, AcceptCallRequest,
    DeclineCallRequest, EndCallRequest, FriendActionRequest
)
from apps.users.models import User
from apps.friends.models import Conversation, Message, Friendship
from django.db.models import Q
from qablny.auth import AuthBearer
from qablny.centrifugo import generate_centrifugo_token, publish_to_centrifugo, broadcast_to_centrifugo
from qablny.push import send_expo_push

realtime_router = Router(tags=["Realtime"])

def _get_redis() -> redis.Redis:
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

@realtime_router.get("/token", response=RealtimeTokenDto, auth=AuthBearer())
def get_centrifugo_token(request):
    user_id_str = str(request.user_id)
    token = generate_centrifugo_token(user_id_str)
    return {
        "token": token,
        "wsUrl": settings.CENTRIFUGO_PUBLIC_URL,
        "channel": f"users:{user_id_str}"
    }

# ── Call Signaling ────────────────────────────────────────────────────────────
@realtime_router.post("/call/initiate", auth=AuthBearer())
def initiate_call(request, req: InitiateCallRequest):
    caller_id = request.user_id
    room_name = f"call_{caller_id}_{req.friendId}_{uuid.uuid4()}"

    publish_to_centrifugo(f"users:{req.friendId}", "IncomingCall", {
        "CallerId": str(caller_id),
        "callerId": str(caller_id),
        "RoomName": room_name,
        "roomName": room_name,
        "CallType": req.callType,
        "callType": req.callType
    })

    # Send push notification
    receiver = User.objects.filter(id=req.friendId).first()
    caller = User.objects.filter(id=caller_id).first()
    if receiver and receiver.expo_push_token and caller:
        call_type_text = "فيديو" if req.callType == "video" else "صوتية"
        send_expo_push(
            receiver.expo_push_token,
            f"مكالمة واردة من {caller.name}",
            f"مكالمة {call_type_text} واردة الآن...",
            {"type": "call", "callerId": str(caller_id), "roomName": room_name, "callType": req.callType}
        )

    return {"roomName": room_name}

@realtime_router.post("/call/accept", auth=AuthBearer())
def accept_call(request, req: AcceptCallRequest):
    rd = _get_redis()
    rd.setex(f"call:start:{req.roomName}", 7200, str(int(time.time())))

    publish_to_centrifugo(f"users:{req.callerId}", "CallAccepted", {
        "FriendId": str(request.user_id),
        "friendId": str(request.user_id),
        "RoomName": req.roomName,
        "roomName": req.roomName
    })
    return {"status": "accepted"}

@realtime_router.post("/call/decline", auth=AuthBearer())
def decline_call(request, req: DeclineCallRequest):
    publish_to_centrifugo(f"users:{req.callerId}", "CallDeclined", str(request.user_id))
    return {"status": "declined"}

@realtime_router.post("/call/end", auth=AuthBearer())
def end_call(request, req: EndCallRequest):
    caller_id = request.user_id
    friend_id = req.friendId
    rd = _get_redis()

    # Calculate duration
    start_ts_str = rd.get(f"call:start:{req.roomName}")
    duration_seconds = 0
    msg_type = 7  # MissedCall

    if start_ts_str:
        duration_seconds = max(0, int(time.time()) - int(start_ts_str))
        msg_type = 6 if req.callType == "video" else 5  # VideoCall or VoiceCall
        rd.delete(f"call:start:{req.roomName}")

    # Notify friend that call ended
    publish_to_centrifugo(f"users:{friend_id}", "CallEnded", str(caller_id))

    # Save Call Log in conversation
    min_id, max_id = (caller_id, friend_id) if str(caller_id) < str(friend_id) else (friend_id, caller_id)
    conv = Conversation.objects.filter(user1_id=min_id, user2_id=max_id).first()
    if not conv:
        conv = Conversation.objects.create(user1_id=min_id, user2_id=max_id)

    msg = Message.objects.create(
        conversation_id=conv.id,
        sender_id=caller_id,
        receiver_id=friend_id,
        type=msg_type,
        content="مكالمة فيديو" if req.callType == "video" else "مكالمة صوتية",
        duration_seconds=duration_seconds
    )
    conv.last_message_at = timezone.now()
    conv.save(update_fields=['last_message_at'])

    # Broadcast Call Log to both users so it appears in Chat instantly
    publish_to_centrifugo(f"users:{friend_id}", "ReceiveMessage", msg.to_dto_dict(friend_id))
    publish_to_centrifugo(f"users:{caller_id}", "ReceiveMessage", msg.to_dto_dict(caller_id))

    return {"status": "ended", "durationSeconds": duration_seconds}

# ── Typing & Recording Indicators ─────────────────────────────────────────────
@realtime_router.post("/typing/start", auth=AuthBearer())
def typing_start(request, req: FriendActionRequest):
    publish_to_centrifugo(f"users:{req.friendId}", "TypingStarted", str(request.user_id))
    return {"status": "ok"}

@realtime_router.post("/typing/stop", auth=AuthBearer())
def typing_stop(request, req: FriendActionRequest):
    publish_to_centrifugo(f"users:{req.friendId}", "TypingStopped", str(request.user_id))
    return {"status": "ok"}

@realtime_router.post("/recording/start", auth=AuthBearer())
def recording_start(request, req: FriendActionRequest):
    publish_to_centrifugo(f"users:{req.friendId}", "RecordingStarted", str(request.user_id))
    return {"status": "ok"}

@realtime_router.post("/recording/stop", auth=AuthBearer())
def recording_stop(request, req: FriendActionRequest):
    publish_to_centrifugo(f"users:{req.friendId}", "RecordingStopped", str(request.user_id))
    return {"status": "ok"}

# ── Presence ──────────────────────────────────────────────────────────────────
@realtime_router.post("/presence/heartbeat", auth=AuthBearer())
def presence_heartbeat(request):
    user_id = request.user_id
    rd = _get_redis()
    key = f"presence:{user_id}"
    was_online = rd.exists(key)
    rd.setex(key, 60, "1")

    now = timezone.now()
    User.objects.filter(id=user_id).update(is_online=True, last_seen=now)

    if not was_online:
        # User just came online: broadcast to friends' Centrifugo channels
        friendships = Friendship.objects.filter(
            Q(requester_id=user_id, status=1) | Q(addressee_id=user_id, status=1)
        )
        friend_ids = [
            str(f.addressee_id if f.requester_id == user_id else f.requester_id)
            for f in friendships
        ]
        channels = [f"users:{fid}" for fid in friend_ids]
        if channels:
            broadcast_to_centrifugo(channels, "UserOnline", str(user_id))

    return {"status": "online"}

@realtime_router.post("/presence/offline", auth=AuthBearer())
def presence_offline(request):
    user_id = request.user_id
    rd = _get_redis()
    rd.delete(f"presence:{user_id}")

    now = timezone.now()
    User.objects.filter(id=user_id).update(is_online=False, last_seen=now)

    friendships = Friendship.objects.filter(
        Q(requester_id=user_id, status=1) | Q(addressee_id=user_id, status=1)
    )
    friend_ids = [
        str(f.addressee_id if f.requester_id == user_id else f.requester_id)
        for f in friendships
    ]
    channels = [f"users:{fid}" for fid in friend_ids]
    if channels:
        broadcast_to_centrifugo(channels, "UserOffline", str(user_id))

    return {"status": "offline"}
