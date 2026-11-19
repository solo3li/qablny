from ninja import NinjaAPI
from apps.users.routers import auth_router, users_router, moderation_router, notifications_router
from apps.friends.routers import friends_router, conversations_router
from apps.friends.streaks_router import streaks_router
from apps.monetization.routers import gifts_router, coins_router, vip_router
from apps.match.routers import match_router
from apps.live.routers import live_router
from apps.rooms.routers import rooms_router
from apps.agency.routers import agency_router
from apps.support.routers import support_router
from apps.realtime.routers import realtime_router
from apps.map.routers import map_router

api = NinjaAPI(
    title="Qablny API",
    version="2.0.0",
    description="Qablny Backend API migrated to Python Django + Centrifugo + Inngest",
)

api.add_router("/auth", auth_router)
api.add_router("/users", users_router)
api.add_router("/friends", friends_router)
api.add_router("/conversations", conversations_router)
api.add_router("/match", match_router)
api.add_router("/gifts", gifts_router)
api.add_router("/coins", coins_router)
api.add_router("/vip", vip_router)
api.add_router("/moderation", moderation_router)
api.add_router("/agency", agency_router)
api.add_router("/live", live_router)
api.add_router("/rooms", rooms_router)
api.add_router("/support", support_router)
api.add_router("/notifications", notifications_router)
api.add_router("/realtime", realtime_router)
api.add_router("/streaks", streaks_router)
api.add_router("/map", map_router)

# Direct /boost shortcut endpoints
from django.shortcuts import get_object_or_404
from apps.users.models import User
from apps.match.schemas import BoostResponseDto, BoostStatusDto
from apps.match.service import MatchmakingService
from qablny.auth import AuthBearer

@api.post("/boost", response=BoostResponseDto, auth=AuthBearer(), tags=["Match"])
def api_boost(request):
    user = get_object_or_404(User, id=request.user_id)
    return MatchmakingService.activate_boost(user)

@api.get("/boost/status", response=BoostStatusDto, auth=AuthBearer(), tags=["Match"])
def api_boost_status(request):
    user = get_object_or_404(User, id=request.user_id)
    is_boosted, ttl = MatchmakingService.is_boosted(user.id)
    return {
        "isBoosted": is_boosted,
        "expiresInSeconds": ttl,
        "coinsRemaining": user.coins,
        "isVip": user.is_vip
    }
