import uuid
from typing import Optional
from ninja import Router, Query
from ninja.errors import HttpError
from apps.map.schemas import (
    UpdateLocationRequest,
    UpdateLocationResponse,
    UserLocationResponse,
    GhostModeRequest,
    GhostModeResponse,
    NearbyUsersResponse
)
from apps.map.service import MapService
from qablny.auth import AuthBearer

map_router = Router(tags=["Map"])

@map_router.post("/location", response=UpdateLocationResponse, auth=AuthBearer())
def update_location(request, data: UpdateLocationRequest):
    try:
        res = MapService.update_location(request.user_id, data.latitude, data.longitude)
        return res
    except ValueError as e:
        raise HttpError(400, str(e))

@map_router.get("/location", response=UserLocationResponse, auth=AuthBearer())
def get_location(request):
    return MapService.get_user_location(request.user_id)

@map_router.get("/ghost-mode", response=GhostModeResponse, auth=AuthBearer())
def get_ghost_mode(request):
    mode = MapService.get_ghost_mode(request.user_id)
    return {
        "success": True,
        "ghostMode": mode,
        "isGhostActive": mode == "ghost",
        "message": "تم استرجاع حالة وضع الشبح"
    }

@map_router.post("/ghost-mode", response=GhostModeResponse, auth=AuthBearer())
def set_ghost_mode(request, data: GhostModeRequest):
    new_mode = MapService.set_ghost_mode(request.user_id, data.ghostMode, toggle=bool(data.toggle))
    msg = "تم تفعيل وضع الشبح بنجاح (أنت مخفي الآن)" if new_mode == "ghost" else f"تم تغيير وضع الخريطة إلى: {new_mode}"
    return {
        "success": True,
        "ghostMode": new_mode,
        "isGhostActive": new_mode == "ghost",
        "message": msg
    }

@map_router.get("/nearby", response=NearbyUsersResponse, auth=AuthBearer())
def get_nearby_users(
    request,
    latitude: float = Query(..., description="Current latitude"),
    longitude: float = Query(..., description="Current longitude"),
    radius: float = Query(15.0, description="Radar search radius in kilometers")
):
    if not (-90.0 <= latitude <= 90.0) or not (-180.0 <= longitude <= 180.0):
        raise HttpError(400, "Invalid coordinates provided")
    if radius <= 0 or radius > 500:
        radius = 15.0

    # Auto-update caller's location if not in ghost mode
    try:
        MapService.update_location(request.user_id, latitude, longitude)
    except Exception:
        pass

    users = MapService.get_nearby_users(request.user_id, latitude, longitude, radius=radius)
    my_mode = MapService.get_ghost_mode(request.user_id)

    return {
        "users": users,
        "count": len(users),
        "radius": radius,
        "myGhostMode": my_mode
    }
