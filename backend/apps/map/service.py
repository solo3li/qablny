import uuid
from datetime import timedelta
import redis
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from apps.users.models import User
from apps.friends.models import Friendship, Message, Streak

GEO_KEY = "map:locations"
GHOST_MODES_KEY = "map:ghost_modes"
USER_LOC_PREFIX = "map:user:"

VALID_GHOST_MODES = {"public", "friends", "ghost"}

def _get_redis() -> redis.Redis:
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

class MapService:
    @staticmethod
    def get_ghost_mode(user_id: uuid.UUID | str) -> str:
        rd = _get_redis()
        mode = rd.hget(GHOST_MODES_KEY, str(user_id))
        if mode in VALID_GHOST_MODES:
            return mode
        return "public"

    @staticmethod
    def set_ghost_mode(user_id: uuid.UUID | str, mode: str | None = None, toggle: bool = False) -> str:
        rd = _get_redis()
        user_id_str = str(user_id)
        current = MapService.get_ghost_mode(user_id_str)

        if toggle:
            # If toggle requested: if currently ghost, flip to public; otherwise flip to ghost
            target_mode = "public" if current == "ghost" else "ghost"
        else:
            target_mode = (mode or "public").lower()
            if target_mode not in VALID_GHOST_MODES:
                target_mode = "public"

        rd.hset(GHOST_MODES_KEY, user_id_str, target_mode)

        # Handle Redis Geospatial membership based on ghost mode
        if target_mode == "ghost":
            rd.zrem(GEO_KEY, user_id_str)
        else:
            # User wants to be visible (public or friends); restore location if saved
            loc = rd.hgetall(f"{USER_LOC_PREFIX}{user_id_str}:location")
            if loc and "latitude" in loc and "longitude" in loc:
                try:
                    lat = float(loc["latitude"])
                    lon = float(loc["longitude"])
                    rd.geoadd(GEO_KEY, (lon, lat, user_id_str))
                except (ValueError, TypeError):
                    pass

        return target_mode

    @staticmethod
    def update_location(user_id: uuid.UUID | str, latitude: float, longitude: float) -> dict:
        if not (-90.0 <= latitude <= 90.0) or not (-180.0 <= longitude <= 180.0):
            raise ValueError("Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180")

        rd = _get_redis()
        user_id_str = str(user_id)
        now_iso = timezone.now().isoformat()

        # Save latest location details in user hash
        loc_key = f"{USER_LOC_PREFIX}{user_id_str}:location"
        rd.hset(loc_key, mapping={
            "latitude": str(latitude),
            "longitude": str(longitude),
            "updatedAt": now_iso
        })

        ghost_mode = MapService.get_ghost_mode(user_id_str)
        if ghost_mode == "ghost":
            # Ensure not visible in GEO_KEY
            rd.zrem(GEO_KEY, user_id_str)
            return {
                "success": True,
                "latitude": latitude,
                "longitude": longitude,
                "ghostMode": ghost_mode,
                "isStored": False,
                "message": "الموقع محفوظ لكنك في وضع الشبح (مخفي عن الخريطة)"
            }
        else:
            rd.geoadd(GEO_KEY, (longitude, latitude, user_id_str))
            return {
                "success": True,
                "latitude": latitude,
                "longitude": longitude,
                "ghostMode": ghost_mode,
                "isStored": True,
                "message": "تم تحديث موقعك بنجاح على الخريطة"
            }

    @staticmethod
    def get_user_location(user_id: uuid.UUID | str) -> dict:
        rd = _get_redis()
        user_id_str = str(user_id)
        loc = rd.hgetall(f"{USER_LOC_PREFIX}{user_id_str}:location")
        ghost_mode = MapService.get_ghost_mode(user_id_str)

        lat = float(loc["latitude"]) if loc and "latitude" in loc else None
        lon = float(loc["longitude"]) if loc and "longitude" in loc else None
        updated_at = loc.get("updatedAt") if loc else None

        return {
            "latitude": lat,
            "longitude": lon,
            "ghostMode": ghost_mode,
            "updatedAt": updated_at
        }

    @staticmethod
    def get_nearby_users(current_user_id: uuid.UUID | str, latitude: float, longitude: float, radius: float = 15.0) -> list:
        rd = _get_redis()
        current_id_str = str(current_user_id)

        # Proximity search via Redis GEOSEARCH with fallback to GEORADIUS
        raw_results = []
        try:
            raw_results = rd.geosearch(
                GEO_KEY,
                longitude=longitude,
                latitude=latitude,
                radius=radius,
                unit="km",
                withdist=True,
                withcoord=True,
                sort="ASC"
            )
        except Exception:
            try:
                raw_results = rd.georadius(
                    GEO_KEY,
                    longitude=longitude,
                    latitude=latitude,
                    radius=radius,
                    unit="km",
                    withdist=True,
                    withcoord=True,
                    sort="ASC"
                )
            except Exception:
                raw_results = []

        if not raw_results:
            return []

        # Parse raw results: [member_id, distance_km, (coord_lon, coord_lat)]
        candidate_ids = []
        dist_map = {}
        coord_map = {}

        for item in raw_results:
            if not item:
                continue
            member_id = item[0]
            if member_id == current_id_str:
                continue  # skip self
            dist_km = float(item[1])
            coords = item[2]  # (lon, lat)
            candidate_ids.append(member_id)
            dist_map[member_id] = dist_km
            coord_map[member_id] = coords

        if not candidate_ids:
            return []

        # Fetch ghost modes for all candidates
        ghost_modes = {}
        if candidate_ids:
            modes = rd.hmget(GHOST_MODES_KEY, candidate_ids)
            for cid, mode in zip(candidate_ids, modes):
                ghost_modes[cid] = mode if mode in VALID_GHOST_MODES else "public"

        # Fetch accepted friendships for current user to know who is a friend
        friend_ids = set()
        friendships = Friendship.objects.filter(
            Q(requester_id=current_user_id) | Q(addressee_id=current_user_id),
            status=1
        ).values_list('requester_id', 'addressee_id')

        for req_id, add_id in friendships:
            if str(req_id) == current_id_str:
                friend_ids.add(str(add_id))
            else:
                friend_ids.add(str(req_id))

        # Filter out candidates based on privacy / ghost mode
        eligible_ids = []
        for cid in candidate_ids:
            mode = ghost_modes.get(cid, "public")
            if mode == "ghost":
                continue  # invisible
            if mode == "friends" and cid not in friend_ids:
                continue  # visible to friends only
            eligible_ids.append(cid)

        if not eligible_ids:
            return []

        # Fetch DB users
        users = User.objects.filter(id__in=eligible_ids, is_blocked=False)
        user_dict = {str(u.id): u for u in users}

        # Fetch active streaks
        streak_dict = {}
        streaks = Streak.objects.filter(
            (Q(user1_id=current_user_id) & Q(user2_id__in=eligible_ids)) |
            (Q(user2_id=current_user_id) & Q(user1_id__in=eligible_ids)),
            is_broken=False
        )
        for s in streaks:
            other_id = str(s.user2_id if str(s.user1_id) == current_id_str else s.user1_id)
            streak_dict[other_id] = s.streak_count

        # Fetch recent snaps (ephemeral type 8) sent in last 24 hours
        yesterday = timezone.now() - timedelta(hours=24)
        recent_snaps = Message.objects.filter(
            sender_id__in=eligible_ids,
            type=8,
            created_at__gte=yesterday
        ).order_by('-created_at')

        snap_map = {}
        for snap in recent_snaps:
            sid = str(snap.sender_id)
            if sid not in snap_map:
                snap_map[sid] = snap.content or "🔥 ستريك نشط"

        result = []
        for cid in eligible_ids:
            user = user_dict.get(cid)
            if not user:
                continue

            dist_km = dist_map.get(cid, 0.0)
            coords = coord_map.get(cid, (0.0, 0.0))
            coord_lon, coord_lat = coords

            if dist_km >= 1.0:
                dist_text = f"{dist_km:.1f} كم"
            else:
                meters = int(dist_km * 1000)
                dist_text = f"{meters} م"

            streak_count = streak_dict.get(cid, 0)
            recent_snap_preview = snap_map.get(cid)

            result.append({
                "id": str(user.id),
                "name": user.name or "مستخدم",
                "bio": user.bio or "",
                "profileImageUrl": user.profile_image_url or "",
                "age": user.age or 0,
                "gender": user.gender,
                "isOnline": user.is_online,
                "lastSeen": user.last_seen.isoformat() if user.last_seen else "",
                "distance": round(dist_km, 2),
                "distanceText": dist_text,
                "latitude": coord_lat,
                "longitude": coord_lon,
                "isFriend": cid in friend_ids,
                "streakDays": streak_count,
                "hasRecentSnap": bool(recent_snap_preview),
                "recentSnapPreview": recent_snap_preview,
                "ghostMode": ghost_modes.get(cid, "public")
            })

        # Sort by distance ascending
        result.sort(key=lambda x: x["distance"])
        return result
