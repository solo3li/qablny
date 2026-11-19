import uuid
from typing import List, Optional
from django.conf import settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import F
from ninja import Router
from ninja.errors import HttpError

from apps.rooms.models import VoiceRoom, VoiceRoomSeat
from apps.rooms.schemas import (
    VoiceRoomListDto, VoiceRoomDetailDto, VoiceRoomSeatDto,
    CreateVoiceRoomRequest, TakeSeatRequest, MuteSeatRequest,
    LockSeatRequest, SendRoomChatRequest, SendRoomGiftRequest,
    RoomTokenResponseDto
)
from apps.users.models import User
from apps.monetization.models import Gift, GiftTransaction, CoinTransaction
from qablny.auth import AuthBearer
from qablny.centrifugo import publish_to_centrifugo
from qablny.livekit import generate_livekit_token

rooms_router = Router(tags=["Voice Rooms"])

def _get_serialized_seats(room_id: uuid.UUID) -> List[dict]:
    seats = list(VoiceRoomSeat.objects.filter(room_id=room_id).order_by('seat_index'))
    user_ids = [s.user_id for s in seats if s.user_id]
    users_map = {u.id: u for u in User.objects.filter(id__in=user_ids)}

    result = []
    for s in seats:
        u = users_map.get(s.user_id) if s.user_id else None
        result.append({
            "seatIndex": s.seat_index,
            "userId": s.user_id,
            "userName": u.name if u else None,
            "userAvatar": u.profile_image_url if u else None,
            "vipLevel": u.vip_level if u else 0,
            "isLocked": s.is_locked,
            "isMuted": s.is_muted,
        })
    return result

@rooms_router.get("", response=List[VoiceRoomListDto], auth=AuthBearer())
@rooms_router.get("/", response=List[VoiceRoomListDto], auth=AuthBearer())
def list_rooms(request, category: Optional[str] = None):
    qs = VoiceRoom.objects.filter(is_active=True).order_by('-created_at')
    if category and category.lower() not in ["all", "الكل", ""]:
        qs = qs.filter(category=category)

    rooms = list(qs[:50])
    host_ids = [r.host_id for r in rooms]
    hosts = {u.id: u for u in User.objects.filter(id__in=host_ids)}

    # Count occupied seats per room
    room_ids = [r.id for r in rooms]
    seats = VoiceRoomSeat.objects.filter(room_id__in=room_ids, user_id__isnull=False)
    occupied_counts = {}
    for s in seats:
        occupied_counts[s.room_id] = occupied_counts.get(s.room_id, 0) + 1

    result = []
    for r in rooms:
        host = hosts.get(r.host_id)
        speakers_count = 1 + occupied_counts.get(r.id, 0)
        result.append({
            "id": r.id,
            "hostId": r.host_id,
            "hostName": host.name if host else "المضيف",
            "hostAvatar": host.profile_image_url if host else None,
            "hostVipLevel": host.vip_level if host else 0,
            "liveKitRoomName": r.livekit_room_name,
            "title": r.title,
            "category": r.category or "chat",
            "coverImageUrl": r.cover_image_url,
            "hasPassword": r.has_password,
            "listenersCount": max(0, r.listeners_count),
            "speakersCount": speakers_count,
            "isActive": r.is_active,
            "createdAt": r.created_at,
        })
    return result

@rooms_router.post("", response=VoiceRoomDetailDto, auth=AuthBearer())
@rooms_router.post("/", response=VoiceRoomDetailDto, auth=AuthBearer())
def create_voice_room(request, req: CreateVoiceRoomRequest):
    user = get_object_or_404(User, id=request.user_id)
    room_id = uuid.uuid4()
    livekit_name = f"voice-{uuid.uuid4().hex[:10]}"

    room = VoiceRoom.objects.create(
        id=room_id,
        host_id=user.id,
        livekit_room_name=livekit_name,
        title=req.title.strip(),
        category=req.category or "chat",
        cover_image_url=req.coverImageUrl,
        has_password=bool(req.password),
        password_hash=req.password if req.password else None,
        listeners_count=1,
        is_active=True
    )

    # Initialize 8 guest seats
    seats_to_create = [
        VoiceRoomSeat(
            id=uuid.uuid4(),
            room_id=room.id,
            seat_index=i,
            user_id=None,
            is_locked=False,
            is_muted=False
        )
        for i in range(1, 9)
    ]
    VoiceRoomSeat.objects.bulk_create(seats_to_create)

    serialized_seats = _get_serialized_seats(room.id)

    # Broadcast new room to global channel
    publish_to_centrifugo("rooms:lobby", "room_created", {
        "id": str(room.id),
        "title": room.title,
        "hostName": user.name,
        "category": room.category
    })

    return {
        "id": room.id,
        "hostId": room.host_id,
        "hostName": user.name,
        "hostAvatar": user.profile_image_url,
        "hostVipLevel": user.vip_level,
        "liveKitRoomName": room.livekit_room_name,
        "title": room.title,
        "category": room.category,
        "coverImageUrl": room.cover_image_url,
        "hasPassword": room.has_password,
        "listenersCount": room.listeners_count,
        "speakersCount": 1,
        "isActive": room.is_active,
        "createdAt": room.created_at,
        "seats": serialized_seats
    }

@rooms_router.get("/{room_id}", response=VoiceRoomDetailDto, auth=AuthBearer())
@rooms_router.get("/{room_id}/", response=VoiceRoomDetailDto, auth=AuthBearer())
def get_room_details(request, room_id: uuid.UUID):
    room = get_object_or_404(VoiceRoom, id=room_id)
    host = User.objects.filter(id=room.host_id).first()
    seats = _get_serialized_seats(room.id)
    speakers_count = 1 + sum(1 for s in seats if s["userId"])

    return {
        "id": room.id,
        "hostId": room.host_id,
        "hostName": host.name if host else "المضيف",
        "hostAvatar": host.profile_image_url if host else None,
        "hostVipLevel": host.vip_level if host else 0,
        "liveKitRoomName": room.livekit_room_name,
        "title": room.title,
        "category": room.category,
        "coverImageUrl": room.cover_image_url,
        "hasPassword": room.has_password,
        "listenersCount": max(0, room.listeners_count),
        "speakersCount": speakers_count,
        "isActive": room.is_active,
        "createdAt": room.created_at,
        "seats": seats
    }

@rooms_router.post("/{room_id}/join", auth=AuthBearer())
@rooms_router.post("/{room_id}/join/", auth=AuthBearer())
def join_room(request, room_id: uuid.UUID):
    room = get_object_or_404(VoiceRoom, id=room_id, is_active=True)
    user = get_object_or_404(User, id=request.user_id)

    VoiceRoom.objects.filter(id=room_id).update(listeners_count=F('listeners_count') + 1)
    room.refresh_from_db(fields=['listeners_count'])

    publish_to_centrifugo(f"rooms:{room_id}", "room_joined", {
        "userId": str(user.id),
        "userName": user.name,
        "userAvatar": user.profile_image_url,
        "listenersCount": room.listeners_count
    })

    return {"status": "ok", "listenersCount": room.listeners_count}

@rooms_router.post("/{room_id}/leave", auth=AuthBearer())
@rooms_router.post("/{room_id}/leave/", auth=AuthBearer())
def leave_room(request, room_id: uuid.UUID):
    room = VoiceRoom.objects.filter(id=room_id).first()
    user = User.objects.filter(id=request.user_id).first()
    if not room or not user:
        return {"status": "ok"}

    if room.listeners_count > 0:
        VoiceRoom.objects.filter(id=room_id).update(listeners_count=F('listeners_count') - 1)
        room.refresh_from_db(fields=['listeners_count'])

    # If user was in a seat, vacate it
    seated = VoiceRoomSeat.objects.filter(room_id=room_id, user_id=user.id).first()
    if seated:
        seated.user_id = None
        seated.is_muted = False
        seated.save(update_fields=['user_id', 'is_muted', 'updated_at'])
        seats = _get_serialized_seats(room_id)
        publish_to_centrifugo(f"rooms:{room_id}", "seat_updated", {
            "seats": seats,
            "action": "leave",
            "seatIndex": seated.seat_index,
            "userId": str(user.id)
        })

    publish_to_centrifugo(f"rooms:{room_id}", "room_left", {
        "userId": str(user.id),
        "listenersCount": max(0, room.listeners_count)
    })

    return {"status": "ok", "listenersCount": max(0, room.listeners_count)}

@rooms_router.post("/{room_id}/seats/{seat_index}/take", auth=AuthBearer())
@rooms_router.post("/{room_id}/seats/{seat_index}/take/", auth=AuthBearer())
def take_seat(request, room_id: uuid.UUID, seat_index: int):
    room = get_object_or_404(VoiceRoom, id=room_id, is_active=True)
    user = get_object_or_404(User, id=request.user_id)

    seat = get_object_or_404(VoiceRoomSeat, room_id=room_id, seat_index=seat_index)
    if seat.is_locked:
        raise HttpError(400, "المقعد مقفل من قِبل المضيف")

    if seat.user_id and seat.user_id != user.id:
        raise HttpError(400, "المقعد مشغول حالياً")

    # If user was already on another seat in this room, free it
    VoiceRoomSeat.objects.filter(room_id=room_id, user_id=user.id).exclude(seat_index=seat_index).update(user_id=None)

    seat.user_id = user.id
    seat.is_muted = False
    seat.updated_at = timezone.now()
    seat.save(update_fields=['user_id', 'is_muted', 'updated_at'])

    seats = _get_serialized_seats(room_id)
    publish_to_centrifugo(f"rooms:{room_id}", "seat_updated", {
        "seats": seats,
        "action": "take",
        "seatIndex": seat_index,
        "user": {
            "id": str(user.id),
            "name": user.name,
            "avatar": user.profile_image_url,
            "vipLevel": user.vip_level
        }
    })

    return {"status": "ok", "seatIndex": seat_index, "seats": seats}

@rooms_router.post("/{room_id}/seats/{seat_index}/leave", auth=AuthBearer())
@rooms_router.post("/{room_id}/seats/{seat_index}/leave/", auth=AuthBearer())
def leave_seat(request, room_id: uuid.UUID, seat_index: int):
    room = get_object_or_404(VoiceRoom, id=room_id)
    seat = get_object_or_404(VoiceRoomSeat, room_id=room_id, seat_index=seat_index)

    # Only occupant or host can vacate
    if seat.user_id != request.user_id and room.host_id != request.user_id:
        raise HttpError(403, "غير مصرح لك بمغادرة هذا المقعد")

    vacated_user_id = str(seat.user_id) if seat.user_id else None
    seat.user_id = None
    seat.is_muted = False
    seat.updated_at = timezone.now()
    seat.save(update_fields=['user_id', 'is_muted', 'updated_at'])

    seats = _get_serialized_seats(room_id)
    publish_to_centrifugo(f"rooms:{room_id}", "seat_updated", {
        "seats": seats,
        "action": "leave",
        "seatIndex": seat_index,
        "userId": vacated_user_id
    })

    return {"status": "ok", "seatIndex": seat_index, "seats": seats}

@rooms_router.post("/{room_id}/seats/{seat_index}/mute", auth=AuthBearer())
@rooms_router.post("/{room_id}/seats/{seat_index}/mute/", auth=AuthBearer())
def mute_seat(request, room_id: uuid.UUID, seat_index: int, req: MuteSeatRequest):
    room = get_object_or_404(VoiceRoom, id=room_id)
    seat = get_object_or_404(VoiceRoomSeat, room_id=room_id, seat_index=seat_index)

    if seat.user_id != request.user_id and room.host_id != request.user_id:
        raise HttpError(403, "غير مصرح لك بكتم هذا المقعد")

    seat.is_muted = req.isMuted
    seat.updated_at = timezone.now()
    seat.save(update_fields=['is_muted', 'updated_at'])

    seats = _get_serialized_seats(room_id)
    publish_to_centrifugo(f"rooms:{room_id}", "seat_updated", {
        "seats": seats,
        "action": "mute",
        "seatIndex": seat_index,
        "isMuted": seat.is_muted
    })

    return {"status": "ok", "seatIndex": seat_index, "isMuted": seat.is_muted}

@rooms_router.post("/{room_id}/seats/{seat_index}/lock", auth=AuthBearer())
@rooms_router.post("/{room_id}/seats/{seat_index}/lock/", auth=AuthBearer())
def lock_seat(request, room_id: uuid.UUID, seat_index: int, req: LockSeatRequest):
    room = get_object_or_404(VoiceRoom, id=room_id)
    if room.host_id != request.user_id:
        raise HttpError(403, "فقط المضيف يمكنه قفل أو فتح المقاعد")

    seat = get_object_or_404(VoiceRoomSeat, room_id=room_id, seat_index=seat_index)
    seat.is_locked = req.isLocked
    if seat.is_locked:
        seat.user_id = None  # Kick occupant when locking
    seat.updated_at = timezone.now()
    seat.save(update_fields=['is_locked', 'user_id', 'updated_at'])

    seats = _get_serialized_seats(room_id)
    publish_to_centrifugo(f"rooms:{room_id}", "seat_updated", {
        "seats": seats,
        "action": "lock",
        "seatIndex": seat_index,
        "isLocked": seat.is_locked
    })

    return {"status": "ok", "seatIndex": seat_index, "isLocked": seat.is_locked}

@rooms_router.post("/{room_id}/chat", auth=AuthBearer())
@rooms_router.post("/{room_id}/chat/", auth=AuthBearer())
def send_room_chat(request, room_id: uuid.UUID, req: SendRoomChatRequest):
    user = get_object_or_404(User, id=request.user_id)
    msg_text = req.message.strip()
    if not msg_text:
        raise HttpError(400, "لا يمكن إرسال رسالة فارغة")

    msg_payload = {
        "id": str(uuid.uuid4()),
        "type": "text",
        "senderId": str(user.id),
        "senderName": user.name,
        "senderAvatar": user.profile_image_url,
        "vipLevel": user.vip_level,
        "message": msg_text,
        "timestamp": timezone.now().isoformat()
    }

    publish_to_centrifugo(f"rooms:{room_id}", "room_chat", msg_payload)
    return msg_payload

@rooms_router.post("/{room_id}/gift", auth=AuthBearer())
@rooms_router.post("/{room_id}/gift/", auth=AuthBearer())
def send_room_gift(request, room_id: uuid.UUID, req: SendRoomGiftRequest):
    sender = get_object_or_404(User, id=request.user_id)
    recipient = get_object_or_404(User, id=req.recipientId)
    gift = get_object_or_404(Gift, id=req.giftId, is_active=True)

    if sender.coins < gift.coin_cost:
        raise HttpError(400, "رصيد العملات غير كافٍ")

    # Deduct coins from sender
    sender.coins -= gift.coin_cost
    sender.save(update_fields=['coins'])

    CoinTransaction.objects.create(
        user_id=sender.id,
        amount=-gift.coin_cost,
        type=4,
        description=f"إرسال هدية في الغرفة الصوتية: {gift.name}"
    )

    GiftTransaction.objects.create(
        sender_id=sender.id,
        receiver_id=recipient.id,
        gift_id=gift.id,
        coins_spent=gift.coin_cost
    )

    # Reward recipient with half
    reward = gift.coin_cost // 2
    recipient.coins += reward
    recipient.save(update_fields=['coins'])
    CoinTransaction.objects.create(
        user_id=recipient.id,
        amount=reward,
        type=2,
        description=f"استلام هدية في الغرفة الصوتية: {gift.name}"
    )

    gift_payload = {
        "id": str(uuid.uuid4()),
        "type": "gift",
        "giftId": str(gift.id),
        "giftName": gift.name,
        "giftEmoji": gift.emoji,
        "coinsSpent": gift.coin_cost,
        "senderId": str(sender.id),
        "senderName": sender.name,
        "senderAvatar": sender.profile_image_url,
        "recipientId": str(recipient.id),
        "recipientName": recipient.name,
        "recipientAvatar": recipient.profile_image_url,
        "timestamp": timezone.now().isoformat()
    }

    publish_to_centrifugo(f"rooms:{room_id}", "room_gift", gift_payload)

    return {
        "success": True,
        "gift": gift_payload,
        "coinsRemaining": sender.coins
    }

@rooms_router.post("/{room_id}/end", auth=AuthBearer())
@rooms_router.post("/{room_id}/end/", auth=AuthBearer())
def end_room(request, room_id: uuid.UUID):
    room = get_object_or_404(VoiceRoom, id=room_id)
    if room.host_id != request.user_id:
        raise HttpError(403, "فقط المضيف يمكنه إنهاء الغرفة")

    room.is_active = False
    room.ended_at = timezone.now()
    room.save(update_fields=['is_active', 'ended_at'])

    publish_to_centrifugo(f"rooms:{room_id}", "room_ended", {
        "roomId": str(room.id),
        "message": "تم إنهاء الغرفة الصوتية بواسطة المضيف"
    })

    return {"status": "ok", "message": "تم إنهاء الغرفة بنجاح"}

@rooms_router.get("/{room_id}/token", response=RoomTokenResponseDto, auth=AuthBearer())
@rooms_router.get("/{room_id}/token/", response=RoomTokenResponseDto, auth=AuthBearer())
def get_room_token(request, room_id: uuid.UUID):
    room = get_object_or_404(VoiceRoom, id=room_id, is_active=True)
    user = get_object_or_404(User, id=request.user_id)

    # Determine if user is speaker (host or holds a seat)
    is_host = (room.host_id == user.id)
    is_seated = VoiceRoomSeat.objects.filter(room_id=room_id, user_id=user.id).exists()
    can_publish = is_host or is_seated

    token = generate_livekit_token(user.id, user.name, room.livekit_room_name, can_publish=can_publish)

    return {
        "token": token,
        "roomName": room.livekit_room_name,
        "serverUrl": settings.LIVEKIT_PUBLIC_URL,
        "isSpeaker": can_publish
    }
