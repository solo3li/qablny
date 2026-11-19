import uuid
import datetime
from typing import List, Optional
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.db import transaction
from django.db.models import Q
from ninja import Router, File, UploadedFile
from ninja.errors import HttpError

from apps.friends.models import Friendship, Conversation, Message, Streak
from apps.friends.schemas import (
    StreakDto, SendStreakRequest, SendStreakResponse,
    RestoreStreakResponse, OpenSnapResponse
)
from apps.users.models import User
from apps.monetization.models import CoinTransaction
from qablny.auth import AuthBearer
from qablny.centrifugo import publish_to_centrifugo
from qablny.push import send_expo_push
from qablny.storage import upload_file

streaks_router = Router(tags=["Streaks"])

def get_canonical_user_ids(user_a: uuid.UUID, user_b: uuid.UUID):
    return (user_a, user_b) if str(user_a) < str(user_b) else (user_b, user_a)

def get_or_create_streak(user_a: uuid.UUID, user_b: uuid.UUID) -> Streak:
    u1, u2 = get_canonical_user_ids(user_a, user_b)
    streak, _ = Streak.objects.get_or_create(
        user1_id=u1,
        user2_id=u2,
        defaults={"streak_count": 0, "is_broken": False}
    )
    return streak

def build_streak_dto(streak: Streak, current_user_id: uuid.UUID) -> dict:
    is_user1 = (current_user_id == streak.user1_id)
    friend_id = streak.user2_id if is_user1 else streak.user1_id
    friend = User.objects.filter(id=friend_id).first()

    now = timezone.now()
    if streak.expires_at and now > streak.expires_at and streak.streak_count > 0 and not streak.is_broken:
        streak.is_broken = True
        streak.save(update_fields=['is_broken'])

    hours_left = None
    if streak.expires_at and not streak.is_broken:
        sec = (streak.expires_at - now).total_seconds()
        hours_left = max(0, int(sec / 3600)) if sec > 0 else 0

    is_expiring_soon = bool(
        streak.streak_count > 0 and
        not streak.is_broken and
        hours_left is not None and
        hours_left <= 4
    )

    my_last_sent = streak.user1_last_sent_at if is_user1 else streak.user2_last_sent_at
    has_sent_today = bool(my_last_sent and (now - my_last_sent).total_seconds() < 86400)
    can_restore = bool(streak.is_broken and streak.streak_count > 0)

    return {
        "id": streak.id,
        "friendId": friend_id,
        "friendName": friend.name if friend else "صديق",
        "friendImage": friend.profile_image_url if friend else None,
        "streakCount": streak.streak_count,
        "expiresAt": streak.expires_at.isoformat() if streak.expires_at else None,
        "hoursLeft": hours_left,
        "isExpiringSoon": is_expiring_soon,
        "isBroken": streak.is_broken,
        "hasSentToday": has_sent_today,
        "canRestore": can_restore,
        "restoreCost": 50,
    }

def get_or_create_conversation(user_a: uuid.UUID, user_b: uuid.UUID) -> Conversation:
    u1, u2 = get_canonical_user_ids(user_a, user_b)
    conv = Conversation.objects.filter(user1_id=u1, user2_id=u2).first()
    if not conv:
        conv = Conversation.objects.create(user1_id=u1, user2_id=u2)
    return conv

# ── 1. List All Streaks ───────────────────────────────────────────────────────
@streaks_router.get("", response=List[StreakDto], auth=AuthBearer())
@streaks_router.get("/", response=List[StreakDto], auth=AuthBearer())
def list_streaks(request):
    user_id = request.user_id
    streaks = Streak.objects.filter(
        Q(user1_id=user_id) | Q(user2_id=user_id)
    ).order_by('-last_interaction_at', '-created_at')

    result = []
    for s in streaks:
        result.append(build_streak_dto(s, user_id))
    return result

# ── 2. Upload Temporary Snap Media ────────────────────────────────────────────
@streaks_router.post("/upload", auth=AuthBearer())
def upload_snap_media(request, file: UploadedFile = File(...)):
    user_id = request.user_id
    content_type = file.content_type or "image/jpeg"
    ext = file.name.split('.')[-1].lower() if '.' in file.name else 'jpg'
    media_type = "video" if ext in ['mp4', 'mov', 'webm', 'm4v'] or 'video' in content_type else "image"
    object_name = f"snaps/{user_id}/{uuid.uuid4()}.{ext}"
    url = upload_file(file.read(), object_name, content_type)
    return {"url": url, "mediaType": media_type}

# ── 3. Send Streak / Ephemeral Snap to Multiple Friends ───────────────────────
@streaks_router.post("/send", response=SendStreakResponse, auth=AuthBearer())
def send_streak(request, payload: SendStreakRequest):
    sender_id = request.user_id
    sender = get_object_or_404(User, id=sender_id)

    if not payload.friendIds:
        raise HttpError(400, "يجب تحديد صديق واحد على الأقل")

    now = timezone.now()
    updated_streaks = []

    for friend_id in payload.friendIds:
        if friend_id == sender_id:
            continue

        friend = User.objects.filter(id=friend_id).first()
        if not friend:
            continue

        # 1. Ephemeral Message in Conversation
        conv = get_or_create_conversation(sender_id, friend_id)
        msg = Message.objects.create(
            conversation_id=conv.id,
            sender_id=sender_id,
            receiver_id=friend_id,
            type=8,  # Ephemeral Snap / Streak
            content=payload.caption or "",
            media_url=payload.mediaUrl,
            duration_seconds=payload.durationSeconds or 10,
            is_read=False,
        )
        conv.last_message_at = now
        conv.save(update_fields=['last_message_at'])

        # 2. Update Streak
        streak = get_or_create_streak(sender_id, friend_id)
        is_user1 = (sender_id == streak.user1_id)
        other_last_sent = streak.user2_last_sent_at if is_user1 else streak.user1_last_sent_at

        was_broken = bool(streak.is_broken or (streak.expires_at and now > streak.expires_at))

        if was_broken:
            # If the streak was broken/expired and was not restored, sending a snap starts a fresh streak
            streak.streak_count = 1
            streak.last_interaction_at = now
            streak.is_broken = False
            streak.expires_at = now + datetime.timedelta(hours=24)
            if is_user1:
                streak.user1_last_sent_at = now
                streak.user2_last_sent_at = None
            else:
                streak.user2_last_sent_at = now
                streak.user1_last_sent_at = None
        else:
            if is_user1:
                streak.user1_last_sent_at = now
            else:
                streak.user2_last_sent_at = now

            # Check reciprocal exchange in current cycle
            if other_last_sent and (now - other_last_sent).total_seconds() < 86400:
                if not streak.last_interaction_at or (now - streak.last_interaction_at).total_seconds() >= 43200 or streak.streak_count == 0:
                    streak.streak_count = (streak.streak_count or 0) + 1
                    streak.last_interaction_at = now
            else:
                if streak.streak_count == 0:
                    streak.streak_count = 1
                    streak.last_interaction_at = now

            streak.expires_at = now + datetime.timedelta(hours=24)
            streak.is_broken = False

        streak.last_sender_id = sender_id
        streak.updated_at = now
        streak.save()

        dto = build_streak_dto(streak, sender_id)
        updated_streaks.append(dto)

        # 3. Realtime Centrifugo Notifications
        msg_dto_receiver = msg.to_dto_dict(friend_id)
        publish_to_centrifugo(f"users:{friend_id}", "ReceiveMessage", msg_dto_receiver)
        publish_to_centrifugo(f"users:{friend_id}", "StreakUpdated", build_streak_dto(streak, friend_id))
        publish_to_centrifugo(f"users:{sender_id}", "StreakUpdated", dto)

        # 4. Push Notification
        if friend.expo_push_token:
            title = f"🔥 ستريك جديد من {sender.name}!"
            body = payload.caption if payload.caption else "أرسل لك ستريك جديد! شاهده قبل أن ينتهي"
            send_expo_push(friend.expo_push_token, title, body, {"type": "streak", "friendId": str(sender_id)})

    return {
        "sentCount": len(updated_streaks),
        "streaks": updated_streaks
    }

# ── 4. Restore Broken Streak (50 Coins) ────────────────────────────────────────
@streaks_router.post("/{streak_id}/restore", response=RestoreStreakResponse, auth=AuthBearer())
def restore_streak(request, streak_id: uuid.UUID):
    user_id = request.user_id
    RESTORE_COST = 50
    now = timezone.now()

    with transaction.atomic():
        user = User.objects.select_for_update().filter(id=user_id).first()
        if not user:
            raise HttpError(404, "المستخدم غير موجود")

        streak = Streak.objects.select_for_update().filter(id=streak_id).first()
        if not streak:
            raise HttpError(404, "الستريك غير موجود")

        if user_id not in [streak.user1_id, streak.user2_id]:
            raise HttpError(403, "غير مصرح لك باستعادة هذا الستريك")

        # Check if expired and needs mark as broken
        if streak.expires_at and now > streak.expires_at and streak.streak_count > 0 and not streak.is_broken:
            streak.is_broken = True
            streak.save(update_fields=['is_broken'])

        if not streak.is_broken:
            raise HttpError(400, "الستريك نشط بالفعل ولا يحتاج استعادة")

        if streak.streak_count <= 0:
            raise HttpError(400, "لا يوجد ستريك مكسور لاستعادته")

        if user.coins < RESTORE_COST:
            raise HttpError(400, f"رصيدك لا يكفي. تحتاج إلى {RESTORE_COST} كوينز لاستعادة الستريك")

        # Deduct coins
        user.coins -= RESTORE_COST
        user.save(update_fields=['coins'])

        # Record Coin Transaction
        CoinTransaction.objects.create(
            user_id=user.id,
            amount=-RESTORE_COST,
            type=4,  # Deduction
            description=f"استعادة ستريك مكسور 🔥 ({streak.streak_count} يوم)"
        )

        # Restore streak
        streak.is_broken = False
        streak.expires_at = now + datetime.timedelta(hours=24)
        streak.last_interaction_at = now
        if user_id == streak.user1_id:
            streak.user1_last_sent_at = now
        else:
            streak.user2_last_sent_at = now
        streak.updated_at = now
        streak.save()

    dto = build_streak_dto(streak, user_id)

    # Realtime notification
    other_user_id = streak.user2_id if user_id == streak.user1_id else streak.user1_id
    publish_to_centrifugo(f"users:{user_id}", "StreakRestored", dto)
    publish_to_centrifugo(f"users:{other_user_id}", "StreakRestored", build_streak_dto(streak, other_user_id))

    return {
        "success": True,
        "streak": dto,
        "coinsRemaining": user.coins
    }

# ── 5. Open Ephemeral Snap (Single View Policy) ────────────────────────────────
@streaks_router.post("/messages/{message_id}/open", response=OpenSnapResponse, auth=AuthBearer())
def open_snap(request, message_id: uuid.UUID):
    user_id = request.user_id
    msg = get_object_or_404(Message, id=message_id)

    if msg.type != 8:
        raise HttpError(400, "هذه الرسالة ليست سناب مؤقت")

    if msg.receiver_id != user_id:
        raise HttpError(403, "غير مصرح لك بفتح هذه الرسالة")

    now = timezone.now()
    if not msg.is_read:
        msg.is_read = True
        msg.save(update_fields=['is_read'])

        # Notify sender that receiver opened the snap
        publish_to_centrifugo(f"users:{msg.sender_id}", "SnapOpened", {
            "messageId": str(msg.id),
            "openedBy": str(user_id),
            "openedAt": now.isoformat()
        })

    return {
        "messageId": msg.id,
        "isRead": True,
        "openedAt": now.isoformat()
    }
