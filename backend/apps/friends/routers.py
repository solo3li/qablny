import uuid
from typing import List, Optional
from datetime import datetime
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.db.models import Q
from ninja import Router, File, UploadedFile
from ninja.errors import HttpError
from apps.friends.models import Friendship, Conversation, Message, Streak
from apps.friends.schemas import FriendDto, FriendRequestDto, MessageDto, SendMessageRequest, ConversationDto
from apps.users.models import User
from qablny.auth import AuthBearer
from qablny.centrifugo import publish_to_centrifugo
from qablny.translation import translate_text
from qablny.push import send_expo_push
from qablny.storage import upload_file

friends_router = Router(tags=["Friends"])
conversations_router = Router(tags=["Conversations"])

def _format_last_seen(last_seen, is_online: bool) -> str:
    if is_online:
        return "متصل الآن"
    if not last_seen:
        return ""
    diff = timezone.now() - last_seen
    mins = int(diff.total_seconds() / 60)
    if mins < 60:
        return f"منذ {max(1, mins)} دقيقة"
    hrs = int(mins / 60)
    if hrs < 24:
        return f"منذ {hrs} ساعة"
    days = int(hrs / 24)
    return f"منذ {days} يوم"

def _format_last_msg(m: Optional[Message]) -> Optional[str]:
    if not m:
        return None
    if m.type == 0:
        return m.content
    if m.type == 1:
        return "🎵 رسالة صوتية"
    if m.type == 2:
        return "🖼️ أرسل صورة"
    if m.type == 3:
        return "🎬 أرسل فيديو"
    if m.type == 4:
        return "📍 أرسل موقع"
    if m.type == 8:
        return "🔥 ستريك مؤقت"
    return m.content

def _get_or_create_conversation(user_a: uuid.UUID, user_b: uuid.UUID) -> Conversation:
    min_id, max_id = (user_a, user_b) if str(user_a) < str(user_b) else (user_b, user_a)
    conv = Conversation.objects.filter(user1_id=min_id, user2_id=max_id).first()
    if not conv:
        conv = Conversation.objects.create(user1_id=min_id, user2_id=max_id)
    return conv

# ── Friends Endpoints ─────────────────────────────────────────────────────────
@friends_router.get("", response=List[FriendDto], auth=AuthBearer())
@friends_router.get("/", response=List[FriendDto], auth=AuthBearer())
def get_friends(request):
    user_id = request.user_id
    friendships = Friendship.objects.filter(
        Q(requester_id=user_id) | Q(addressee_id=user_id),
        status=1  # Accepted
    )

    streaks = Streak.objects.filter(Q(user1_id=user_id) | Q(user2_id=user_id))
    streak_map = {}
    now = timezone.now()
    for s in streaks:
        fid = s.user2_id if s.user1_id == user_id else s.user1_id
        is_u1 = (user_id == s.user1_id)
        if s.expires_at and now > s.expires_at and s.streak_count > 0 and not s.is_broken:
            s.is_broken = True
            s.save(update_fields=['is_broken'])
        hours_left = None
        if s.expires_at and not s.is_broken:
            sec = (s.expires_at - now).total_seconds()
            hours_left = max(0, int(sec / 3600)) if sec > 0 else 0
        my_last_sent = s.user1_last_sent_at if is_u1 else s.user2_last_sent_at
        sent_today = bool(my_last_sent and (now - my_last_sent).total_seconds() < 86400)
        streak_map[fid] = {
            "streakCount": s.streak_count,
            "streakHoursLeft": hours_left,
            "isStreakExpiringSoon": bool(s.streak_count > 0 and not s.is_broken and hours_left is not None and hours_left <= 4),
            "hasSentStreakToday": sent_today,
            "isStreakBroken": s.is_broken,
            "streakId": s.id
        }

    result = []
    for f in friendships:
        friend_id = f.addressee_id if f.requester_id == user_id else f.requester_id
        friend = User.objects.filter(id=friend_id).first()
        if not friend:
            continue

        unread_count = Message.objects.filter(sender_id=friend.id, receiver_id=user_id, is_read=False).count()
        last_msg = Message.objects.filter(
            Q(sender_id=user_id, receiver_id=friend.id) | Q(sender_id=friend.id, receiver_id=user_id)
        ).order_by('-created_at').first()

        st = streak_map.get(friend.id, {})
        result.append({
            "id": friend.id,
            "name": friend.name,
            "profileImageUrl": friend.profile_image_url,
            "gender": friend.gender,
            "location": friend.location,
            "age": friend.age,
            "isOnline": friend.is_online,
            "lastSeen": _format_last_seen(friend.last_seen, friend.is_online),
            "unreadCount": unread_count,
            "lastMessage": _format_last_msg(last_msg),
            "streakCount": st.get("streakCount", 0),
            "streakHoursLeft": st.get("streakHoursLeft"),
            "isStreakExpiringSoon": st.get("isStreakExpiringSoon", False),
            "hasSentStreakToday": st.get("hasSentStreakToday", False),
            "isStreakBroken": st.get("isStreakBroken", False),
            "streakId": st.get("streakId"),
        })

    result.sort(key=lambda x: x["isOnline"], reverse=True)
    return result

@friends_router.get("/requests", response=List[FriendRequestDto], auth=AuthBearer())
def get_pending_requests(request):
    user_id = request.user_id
    pending = Friendship.objects.filter(addressee_id=user_id, status=0).order_by('-created_at')
    requester_ids = [p.requester_id for p in pending]
    users = {u.id: u for u in User.objects.filter(id__in=requester_ids)}

    result = []
    for p in pending:
        u = users.get(p.requester_id)
        if u:
            result.append({
                "id": p.id,
                "senderId": u.id,
                "senderName": u.name,
                "senderImage": u.profile_image_url,
                "senderBio": u.bio,
                "createdAt": p.created_at.isoformat() if p.created_at else ""
            })
    return result

@friends_router.post("/request/{user_id}", auth=AuthBearer())
def send_friend_request(request, user_id: uuid.UUID):
    my_id = request.user_id
    if my_id == user_id:
        raise HttpError(400, "لا يمكن إرسال طلب لنفسك")

    existing = Friendship.objects.filter(
        Q(requester_id=my_id, addressee_id=user_id) | Q(requester_id=user_id, addressee_id=my_id)
    ).exists()
    if existing:
        raise HttpError(400, "طلب الصداقة موجود بالفعل أو أنتم أصدقاء")

    Friendship.objects.create(requester_id=my_id, addressee_id=user_id, status=0)
    
    # Notify addressee via Centrifugo
    sender = User.objects.filter(id=my_id).first()
    if sender:
        publish_to_centrifugo(f"users:{user_id}", "FriendRequestReceived", {
            "id": sender.id,
            "name": sender.name,
            "profileImageUrl": sender.profile_image_url
        })
    return {"message": "Friend request sent"}

@friends_router.put("/accept/{target_id}", auth=AuthBearer())
def accept_friend_request(request, target_id: uuid.UUID):
    my_id = request.user_id
    f = Friendship.objects.filter(
        Q(id=target_id) | Q(requester_id=target_id),
        addressee_id=my_id,
        status=0
    ).first()
    if not f:
        raise HttpError(404, "طلب الصداقة غير موجود")

    f.status = 1  # Accepted
    f.updated_at = timezone.now()
    f.save(update_fields=['status', 'updated_at'])

    publish_to_centrifugo(f"users:{f.requester_id}", "FriendRequestAccepted", {"friendId": str(my_id)})
    return {"message": "Friend request accepted"}

@friends_router.put("/decline/{target_id}", auth=AuthBearer())
def decline_friend_request(request, target_id: uuid.UUID):
    my_id = request.user_id
    Friendship.objects.filter(
        Q(id=target_id) | Q(requester_id=target_id),
        addressee_id=my_id,
        status=0
    ).delete()
    return {"message": "Friend request declined"}

@friends_router.delete("/{user_id}", auth=AuthBearer())
def remove_friend(request, user_id: uuid.UUID):
    my_id = request.user_id
    Friendship.objects.filter(
        Q(requester_id=my_id, addressee_id=user_id) | Q(requester_id=user_id, addressee_id=my_id)
    ).delete()
    return HttpResponse(status=204)

# ── Conversations Endpoints ───────────────────────────────────────────────────
@conversations_router.get("", response=List[ConversationDto], auth=AuthBearer())
@conversations_router.get("/", response=List[ConversationDto], auth=AuthBearer())
def get_conversations(request):
    user_id = request.user_id
    convs = Conversation.objects.filter(
        Q(user1_id=user_id) | Q(user2_id=user_id)
    ).order_by('-last_message_at')

    streaks = Streak.objects.filter(Q(user1_id=user_id) | Q(user2_id=user_id))
    streak_map = {}
    now = timezone.now()
    for s in streaks:
        fid = s.user2_id if s.user1_id == user_id else s.user1_id
        is_u1 = (user_id == s.user1_id)
        if s.expires_at and now > s.expires_at and s.streak_count > 0 and not s.is_broken:
            s.is_broken = True
            s.save(update_fields=['is_broken'])
        hours_left = None
        if s.expires_at and not s.is_broken:
            sec = (s.expires_at - now).total_seconds()
            hours_left = max(0, int(sec / 3600)) if sec > 0 else 0
        my_last_sent = s.user1_last_sent_at if is_u1 else s.user2_last_sent_at
        sent_today = bool(my_last_sent and (now - my_last_sent).total_seconds() < 86400)
        streak_map[fid] = {
            "streakCount": s.streak_count,
            "streakHoursLeft": hours_left,
            "isStreakExpiringSoon": bool(s.streak_count > 0 and not s.is_broken and hours_left is not None and hours_left <= 4),
            "hasSentStreakToday": sent_today,
            "isStreakBroken": s.is_broken,
            "streakId": s.id
        }

    result = []
    for c in convs:
        friend_id = c.user2_id if c.user1_id == user_id else c.user1_id
        friend = User.objects.filter(id=friend_id).first()
        if not friend:
            continue

        unread_count = Message.objects.filter(
            conversation_id=c.id, receiver_id=user_id, is_read=False
        ).count()
        last_msg = Message.objects.filter(conversation_id=c.id).order_by('-created_at').first()

        st = streak_map.get(friend.id, {})
        result.append({
            "id": c.id,
            "friend": {
                "id": friend.id,
                "name": friend.name,
                "profileImageUrl": friend.profile_image_url,
                "gender": friend.gender,
                "location": friend.location,
                "age": friend.age,
                "isOnline": friend.is_online,
                "lastSeen": _format_last_seen(friend.last_seen, friend.is_online),
                "unreadCount": unread_count,
                "lastMessage": _format_last_msg(last_msg),
                "streakCount": st.get("streakCount", 0),
                "streakHoursLeft": st.get("streakHoursLeft"),
                "isStreakExpiringSoon": st.get("isStreakExpiringSoon", False),
                "hasSentStreakToday": st.get("hasSentStreakToday", False),
                "isStreakBroken": st.get("isStreakBroken", False),
                "streakId": st.get("streakId"),
            },
            "lastMessage": last_msg.to_dto_dict(user_id) if last_msg else None,
            "unreadCount": unread_count
        })
    return result

@conversations_router.get("/{friend_id}/messages", response=List[MessageDto], auth=AuthBearer())
def get_messages(request, friend_id: uuid.UUID, page: int = 1, pageSize: int = 50):
    user_id = request.user_id
    conv = _get_or_create_conversation(user_id, friend_id)

    offset = (page - 1) * pageSize
    messages = Message.objects.filter(conversation_id=conv.id).order_by('created_at')[offset:offset + pageSize]
    return [m.to_dto_dict(user_id) for m in messages]

@conversations_router.post("/{friend_id}/messages", response=MessageDto, auth=AuthBearer())
def send_message(request, friend_id: uuid.UUID, req: SendMessageRequest):
    sender_id = request.user_id
    conv = _get_or_create_conversation(sender_id, friend_id)

    translation = None
    if req.type == 0 and req.content:
        translation = translate_text(req.content, "en")

    msg = Message.objects.create(
        conversation_id=conv.id,
        sender_id=sender_id,
        receiver_id=friend_id,
        type=req.type,
        content=req.content,
        translation=translation,
        duration_seconds=req.durationSeconds,
        media_url=req.mediaUrl,
        location_name=req.locationName,
        location_lat=req.locationLat,
        location_lng=req.locationLng,
    )

    conv.last_message_at = timezone.now()
    conv.save(update_fields=['last_message_at'])

    dto = msg.to_dto_dict(sender_id)

    # Publish to receiver via Centrifugo
    publish_to_centrifugo(f"users:{friend_id}", "ReceiveMessage", msg.to_dto_dict(friend_id))
    # Confirm to sender via Centrifugo
    publish_to_centrifugo(f"users:{sender_id}", "MessageSent", dto)

    # Push Notification
    receiver = User.objects.filter(id=friend_id).first()
    sender = User.objects.filter(id=sender_id).first()
    if receiver and receiver.expo_push_token and sender:
        title = f"رسالة جديدة من {sender.name}"
        body = req.content if req.type == 0 else f"أرسل لك محتوى ({req.type})"
        send_expo_push(receiver.expo_push_token, title, body, {"type": "message", "friendId": str(sender_id)})

    return dto

@conversations_router.put("/{friend_id}/read", auth=AuthBearer())
def mark_read(request, friend_id: uuid.UUID):
    user_id = request.user_id
    Message.objects.filter(sender_id=friend_id, receiver_id=user_id, is_read=False).update(is_read=True)
    publish_to_centrifugo(f"users:{friend_id}", "MessagesRead", str(user_id))
    return {"message": "Messages marked as read"}

@conversations_router.post("/upload", auth=AuthBearer())
def upload_chat_media(request, file: UploadedFile = File(...)):
    user_id = request.user_id
    content_type = file.content_type or "application/octet-stream"
    ext = file.name.split('.')[-1] if '.' in file.name else 'bin'
    object_name = f"chat/{user_id}/{uuid.uuid4()}.{ext}"
    url = upload_file(file.read(), object_name, content_type)
    return {"url": url}
