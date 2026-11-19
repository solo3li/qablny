import uuid
from typing import List
from django.conf import settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from ninja import Router
from apps.live.models import LiveRoom
from apps.live.schemas import LiveRoomDto, CreateLiveRoomRequest
from apps.match.schemas import LiveKitTokenDto
from apps.users.models import User
from qablny.auth import AuthBearer
from qablny.livekit import generate_livekit_token

live_router = Router(tags=["Live"])

@live_router.get("", response=List[LiveRoomDto], auth=AuthBearer())
@live_router.get("/", response=List[LiveRoomDto], auth=AuthBearer())
def get_active_rooms(request):
    rooms = LiveRoom.objects.filter(is_active=True).order_by('-started_at')
    host_ids = [r.host_id for r in rooms]
    hosts = {u.id: u for u in User.objects.filter(id__in=host_ids)}

    result = []
    for r in rooms:
        host = hosts.get(r.host_id)
        result.append({
            "id": r.id,
            "hostId": r.host_id,
            "hostName": host.name if host else "Host",
            "hostImageUrl": host.profile_image_url if host else None,
            "liveKitRoomName": r.livekit_room_name,
            "title": r.title,
            "coverImageUrl": r.cover_image_url,
            "viewersCount": r.viewers_count,
            "startedAt": r.started_at
        })
    return result

@live_router.post("", response=LiveRoomDto, auth=AuthBearer())
@live_router.post("/", response=LiveRoomDto, auth=AuthBearer())
def create_room(request, req: CreateLiveRoomRequest):
    user = get_object_or_404(User, id=request.user_id)
    room = LiveRoom.objects.create(
        host_id=user.id,
        livekit_room_name=f"live-{uuid.uuid4()}",
        title=req.title,
        cover_image_url=req.coverImageUrl,
        is_active=True
    )
    return {
        "id": room.id,
        "hostId": room.host_id,
        "hostName": user.name,
        "hostImageUrl": user.profile_image_url,
        "liveKitRoomName": room.livekit_room_name,
        "title": room.title,
        "coverImageUrl": room.cover_image_url,
        "viewersCount": room.viewers_count,
        "startedAt": room.started_at
    }

@live_router.post("/{room_id}/end", auth=AuthBearer())
def end_room(request, room_id: uuid.UUID):
    room = LiveRoom.objects.filter(id=room_id, host_id=request.user_id).first()
    if room:
        room.is_active = False
        room.ended_at = timezone.now()
        room.save(update_fields=['is_active', 'ended_at'])
    return {"message": "Room ended"}

@live_router.get("/token/{room_name}", response=LiveKitTokenDto, auth=AuthBearer())
def get_live_token(request, room_name: str):
    user = get_object_or_404(User, id=request.user_id)
    token = generate_livekit_token(user.id, user.name, room_name)
    return {
        "token": token,
        "roomName": room_name,
        "serverUrl": settings.LIVEKIT_PUBLIC_URL
    }
