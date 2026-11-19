import uuid
import secrets
import datetime
from typing import Optional
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.db.models import Q
from ninja import Router, File, UploadedFile
from ninja.errors import HttpError
from apps.users.models import User, RefreshToken, UserBlock, Report, Notification
from apps.users.schemas import (
    RegisterRequest, LoginRequest, RefreshRequest, AuthResponse,
    UserDto, UpdateProfileRequest, PushTokenRequest, JoinAgencyRequest,
    ReportRequest, BlockedUserDto, NotificationDto, SearchUserDto
)
from qablny.auth import hash_password, verify_password, create_access_token, AuthBearer
from qablny.storage import upload_file

auth_router = Router(tags=["Auth"])
users_router = Router(tags=["Users"])
moderation_router = Router(tags=["Moderation"])
notifications_router = Router(tags=["Notifications"])

def _build_auth_response(user: User) -> dict:
    access_token = create_access_token(user)
    refresh_token_str = secrets.token_urlsafe(48)
    expires_at = timezone.now() + datetime.timedelta(days=30)
    RefreshToken.objects.create(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=expires_at
    )
    return {
        "accessToken": access_token,
        "refreshToken": refresh_token_str,
        "expiresAt": timezone.now() + datetime.timedelta(minutes=60),
        "user": user.to_dto_dict()
    }

# ── Auth Endpoints ────────────────────────────────────────────────────────────
@auth_router.post("/register", response=AuthResponse)
def register(request, req: RegisterRequest):
    email = req.email.strip().lower()
    if User.objects.filter(email=email).exists():
        raise HttpError(400, "البريد الإلكتروني مستخدم بالفعل")

    user = User(
        email=email,
        password_hash=hash_password(req.password),
        name=req.name,
        age=req.age,
        gender=req.gender,
        location=req.location,
    )
    user.save()
    return _build_auth_response(user)

@auth_router.post("/login", response=AuthResponse)
def login(request, req: LoginRequest):
    email = req.email.strip().lower()
    user = User.objects.filter(email=email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HttpError(401, "بيانات الدخول غير صحيحة")

    if user.is_blocked:
        raise HttpError(401, "تم حظر هذا الحساب")

    return _build_auth_response(user)

@auth_router.post("/refresh", response=AuthResponse)
def refresh_token(request, req: RefreshRequest):
    rt = RefreshToken.objects.filter(
        token=req.refreshToken,
        is_revoked=False,
        expires_at__gt=timezone.now()
    ).first()
    if not rt:
        raise HttpError(401, "Refresh token منتهي أو غير صالح")

    rt.is_revoked = True
    rt.save(update_fields=['is_revoked'])

    user = get_object_or_404(User, id=rt.user_id)
    return _build_auth_response(user)

@auth_router.post("/logout", auth=AuthBearer())
def logout(request, req: RefreshRequest):
    rt = RefreshToken.objects.filter(token=req.refreshToken).first()
    if rt:
        rt.is_revoked = True
        rt.save(update_fields=['is_revoked'])
    return {"message": "Logged out successfully"}

# ── Users Endpoints ───────────────────────────────────────────────────────────
@users_router.get("/me", response=UserDto, auth=AuthBearer())
def get_me(request):
    user = get_object_or_404(User, id=request.user_id)
    return user.to_dto_dict()

@users_router.put("/me", response=UserDto, auth=AuthBearer())
def update_me(request, req: UpdateProfileRequest):
    user = get_object_or_404(User, id=request.user_id)
    if req.name is not None:
        user.name = req.name
    if req.bio is not None:
        user.bio = req.bio
    if req.location is not None:
        user.location = req.location
    if req.interests is not None:
        user.set_interests(req.interests)
    if req.age is not None:
        user.age = req.age
    user.save()
    return user.to_dto_dict()

@users_router.put("/me/image", auth=AuthBearer())
def upload_avatar(request, file: UploadedFile = File(...)):
    user = get_object_or_404(User, id=request.user_id)
    content_type = file.content_type or "image/jpeg"
    ext = ".png" if "png" in content_type else (".webp" if "webp" in content_type else ".jpg")
    object_name = f"avatars/{user.id}{ext}"
    url = upload_file(file.read(), object_name, content_type)
    user.profile_image_url = url
    user.save(update_fields=['profile_image_url'])
    return {"url": url}

@users_router.put("/me/push-token", auth=AuthBearer())
def update_push_token(request, req: PushTokenRequest):
    user = get_object_or_404(User, id=request.user_id)
    user.expo_push_token = req.token
    user.save(update_fields=['expo_push_token'])
    return {"message": "Push token updated"}

@users_router.get("/search", response=list[SearchUserDto], auth=AuthBearer())
def search_users(request, q: Optional[str] = None, limit: int = 20):
    my_id = request.user_id
    query = User.objects.filter(is_blocked=False).exclude(id=my_id)
    if q and q.strip():
        term = q.strip()
        query = query.filter(Q(name__icontains=term) | Q(email__icontains=term) | Q(location__icontains=term))
    else:
        query = query.order_by('-is_online', '-last_seen')

    users = list(query[:limit])
    if not users:
        return []

    user_ids = [u.id for u in users]
    from apps.friends.models import Friendship
    friendships = Friendship.objects.filter(
        Q(requester_id=my_id, addressee_id__in=user_ids) |
        Q(addressee_id=my_id, requester_id__in=user_ids)
    )
    status_map = {}
    for f in friendships:
        other_id = f.addressee_id if f.requester_id == my_id else f.requester_id
        if f.status == 1:
            status_map[other_id] = "friend"
        elif f.status == 0:
            if f.requester_id == my_id:
                status_map[other_id] = "pending_sent"
            else:
                status_map[other_id] = "pending_received"

    return [
        {
            "id": u.id,
            "name": u.name,
            "bio": u.bio,
            "profileImageUrl": u.profile_image_url,
            "age": u.age,
            "gender": u.gender,
            "location": u.location,
            "isOnline": u.is_online,
            "relationshipStatus": status_map.get(u.id, "none"),
        }
        for u in users
    ]

@users_router.get("/{id}", response=UserDto, auth=AuthBearer())
def get_user_by_id(request, id: uuid.UUID):
    user = get_object_or_404(User, id=id)
    return user.to_dto_dict()

@users_router.delete("/me", auth=AuthBearer())
def delete_me(request):
    user = get_object_or_404(User, id=request.user_id)
    user.delete()
    return HttpResponse(status=204)

@users_router.post("/me/agency/join", auth=AuthBearer())
def join_agency(request, req: JoinAgencyRequest):
    from apps.agency.models import Agency
    agency = Agency.objects.filter(invite_code=req.inviteCode, is_active=True).first()
    if not agency:
        raise HttpError(400, "كود الدعوة غير صحيح أو الوكالة غير نشطة.")

    user = get_object_or_404(User, id=request.user_id)
    if user.agency_id:
        raise HttpError(400, "أنت منضم بالفعل لوكالة أخرى.")

    user.agency_id = agency.id
    user.save(update_fields=['agency_id'])
    return {"message": "تم الانضمام للوكالة بنجاح!"}

@users_router.post("/me/agency/leave", auth=AuthBearer())
def leave_agency(request):
    user = get_object_or_404(User, id=request.user_id)
    if not user.agency_id:
        raise HttpError(400, "أنت لست منضماً لأي وكالة.")

    user.agency_id = None
    user.save(update_fields=['agency_id'])
    return {"message": "تمت مغادرة الوكالة بنجاح."}

# ── Moderation Endpoints ──────────────────────────────────────────────────────
@moderation_router.post("/report/{user_id}", auth=AuthBearer())
def file_report(request, user_id: uuid.UUID, req: ReportRequest):
    if request.user_id == user_id:
        raise HttpError(400, "لا يمكن الإبلاغ عن نفسك")
    Report.objects.create(
        reporter_id=request.user_id,
        reported_user_id=user_id,
        reason=req.reason
    )
    return {"message": "Report submitted"}

@moderation_router.post("/block/{user_id}", auth=AuthBearer())
def block_user(request, user_id: uuid.UUID):
    if request.user_id == user_id:
        raise HttpError(400, "لا يمكن حظر نفسك")
    if not UserBlock.objects.filter(blocker_id=request.user_id, blocked_user_id=user_id).exists():
        UserBlock.objects.create(blocker_id=request.user_id, blocked_user_id=user_id)
    return {"message": "User blocked"}

@moderation_router.delete("/block/{user_id}", auth=AuthBearer())
def unblock_user(request, user_id: uuid.UUID):
    UserBlock.objects.filter(blocker_id=request.user_id, blocked_user_id=user_id).delete()
    return {"message": "User unblocked"}

@moderation_router.get("/blocked", response=list[BlockedUserDto], auth=AuthBearer())
def get_blocked_users(request):
    blocked_ids = list(UserBlock.objects.filter(blocker_id=request.user_id).values_list('blocked_user_id', flat=True))
    blocked_users = User.objects.filter(id__in=blocked_ids)
    return [
        {
            "id": u.id,
            "name": u.name,
            "profileImageUrl": u.profile_image_url
        }
        for u in blocked_users
    ]

# ── Notifications Endpoints ───────────────────────────────────────────────────
@notifications_router.get("", response=list[NotificationDto], auth=AuthBearer())
@notifications_router.get("/", response=list[NotificationDto], auth=AuthBearer())
def get_notifications(request):
    notifications = Notification.objects.filter(user_id=request.user_id).order_by('-created_at')[:50]
    return [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "isRead": n.is_read,
            "imageUrl": n.image_url,
            "actionId": n.action_id,
            "createdAt": n.created_at
        }
        for n in notifications
    ]

@notifications_router.post("/mark-all-read", auth=AuthBearer())
def mark_all_notifications_read(request):
    Notification.objects.filter(user_id=request.user_id, is_read=False).update(is_read=True)
    return {"message": "All notifications marked as read"}

@notifications_router.post("/{id}/read", auth=AuthBearer())
def mark_notification_read(request, id: uuid.UUID):
    Notification.objects.filter(id=id, user_id=request.user_id).update(is_read=True)
    return {"message": "Notification marked as read"}
