from ninja import Router
from ninja.errors import HttpError
from django.conf import settings
from django.shortcuts import get_object_or_404
from apps.users.models import User
from apps.monetization.models import CoinTransaction
from apps.match.schemas import JoinQueueRequest, LiveKitTokenDto, BoostStatusDto, BoostResponseDto
from apps.match.service import MatchmakingService
from qablny.auth import AuthBearer
from qablny.livekit import generate_livekit_token
from qablny.inngest_client import inngest_client
import inngest

match_router = Router(tags=["Match"])

@match_router.get("/token/{room_name}", response=LiveKitTokenDto, auth=AuthBearer())
def get_livekit_token(request, room_name: str):
    user = get_object_or_404(User, id=request.user_id)
    token = generate_livekit_token(user.id, user.name, room_name)
    return {
        "token": token,
        "roomName": room_name,
        "serverUrl": settings.LIVEKIT_PUBLIC_URL
    }

@match_router.post("/queue/join", auth=AuthBearer())
def join_match_queue(request, req: JoinQueueRequest):
    user = get_object_or_404(User, id=request.user_id)
    pref_gender = req.genderPref if req.genderPref is not None else req.preferredGender
    if pref_gender is not None:
        if user.coins < 5:
            raise HttpError(400, "رصيد العملات غير كافٍ لاستخدام الفلاتر.")
        user.coins -= 5
        user.save(update_fields=['coins'])
        CoinTransaction.objects.create(
            user_id=user.id,
            amount=-5,
            type=4,  # Deduction
            description="استخدام فلتر الجنس في المطابقة"
        )

    result = MatchmakingService.join_queue(user, req.dict())

    # Send inngest event asynchronously if queued
    if result.get("status") == "queued":
        try:
            inngest_client.send_sync(
                inngest.Event(
                    name="match/queued",
                    data={"userId": str(user.id)}
                )
            )
        except Exception:
            pass

    return result

@match_router.post("/queue/leave", auth=AuthBearer())
def leave_match_queue(request):
    MatchmakingService.leave_queue(request.user_id)
    return {"message": "Left queue"}

@match_router.post("/skip", auth=AuthBearer())
def skip_match(request):
    user = get_object_or_404(User, id=request.user_id)
    result = MatchmakingService.skip(user)
    return result

@match_router.post("/boost", response=BoostResponseDto, auth=AuthBearer())
def activate_boost(request):
    user = get_object_or_404(User, id=request.user_id)
    return MatchmakingService.activate_boost(user)

@match_router.get("/boost/status", response=BoostStatusDto, auth=AuthBearer())
def get_boost_status(request):
    user = get_object_or_404(User, id=request.user_id)
    is_boosted, ttl = MatchmakingService.is_boosted(user.id)
    return {
        "isBoosted": is_boosted,
        "expiresInSeconds": ttl,
        "coinsRemaining": user.coins,
        "isVip": user.is_vip
    }
