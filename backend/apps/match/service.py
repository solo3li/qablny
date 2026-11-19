import json
import logging
import uuid
import redis
from ninja.errors import HttpError
from django.conf import settings
from django.utils import timezone
from apps.users.models import User, UserBlock
from apps.match.models import MatchSession
from apps.match.schemas import MatchedUserDto, MatchFoundDto
from apps.monetization.models import CoinTransaction
from qablny.livekit import generate_livekit_token, new_room_name
from qablny.centrifugo import publish_to_centrifugo

logger = logging.getLogger("MatchmakingService")

# Redis queue keys
QUEUE_ALL = "match:queue:all"
QUEUE_MALE = "match:queue:male"
QUEUE_FEMALE = "match:queue:female"

BOOST_COST = 20   # Coins to activate Boost (Free for VIP)
BOOST_TTL = 1800  # 30 minutes in seconds

def _get_redis() -> redis.Redis:
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

# Atomic Lua script to pop a candidate from a queue excluding the current user
LUA_POP_CANDIDATE = """
local q = KEYS[1]
local my_id = ARGV[1]
local len = redis.call('LLEN', q)

for i = 1, len do
    local candidate = redis.call('LPOP', q)
    if candidate and candidate ~= my_id then
        return candidate
    elseif candidate == my_id then
        -- Skip self, do not re-add
    end
end
return nil
"""

class MatchmakingService:
    @staticmethod
    def is_in_queue(user_id: str) -> bool:
        rd = _get_redis()
        try:
            items = rd.lrange(QUEUE_ALL, 0, -1)
            return str(user_id) in items
        except Exception:
            return False

    @staticmethod
    def is_boosted(user_id: uuid.UUID) -> tuple[bool, int]:
        rd = _get_redis()
        try:
            ttl = rd.ttl(f"match:boost:{user_id}")
            if ttl and ttl > 0:
                return True, ttl
            return False, 0
        except Exception:
            return False, 0

    @classmethod
    def activate_boost(cls, user: User) -> dict:
        rd = _get_redis()
        user_id_str = str(user.id)
        is_vip = user.is_vip
        cost = 0 if is_vip else BOOST_COST

        # Check if already boosted to prevent double-deduction
        is_already_boosted, remaining_ttl = cls.is_boosted(user.id)
        if is_already_boosted:
            logger.info(f"User {user.name} ({user.id}) is already boosted ({remaining_ttl}s remaining). Skipping deduction.")
            return {
                "status": "already_boosted",
                "message": "ميزة Boost مفعلة بالفعل لديك حالياً.",
                "expiresInSeconds": remaining_ttl,
                "coinsRemaining": user.coins,
                "isVip": is_vip
            }

        if not is_vip:
            if user.coins < cost:
                raise HttpError(400, f"رصيد العملات غير كافٍ لتفعيل ميزة Boost. تحتاج {cost} عملة.")
            user.coins -= cost
            user.save(update_fields=['coins'])
            CoinTransaction.objects.create(
                user_id=user.id,
                amount=-cost,
                type=4,  # Deduction
                description="تفعيل ميزة البوست (Match Boost)"
            )

        # Set boost TTL in Redis
        rd.setex(f"match:boost:{user_id_str}", BOOST_TTL, "1")

        # If user is currently waiting in queue, promote them to the FRONT!
        if cls.is_in_queue(user_id_str):
            cls.remove_from_all_queues(user_id_str)
            cls._push_user_to_queue(user_id_str, user.gender, at_front=True)

        # Notify via Centrifugo
        publish_to_centrifugo(f"users:{user.id}", "BoostActivated", {
            "boostActive": True,
            "expiresIn": BOOST_TTL,
            "coinsRemaining": user.coins,
            "isVip": is_vip
        })

        logger.info(f"User {user.name} ({user.id}) activated Boost!")
        return {
            "status": "boosted",
            "message": "تم تفعيل ميزة Boost بنجاح! لديك الأولوية القصوى في المطابقة.",
            "expiresInSeconds": BOOST_TTL,
            "coinsRemaining": user.coins,
            "isVip": is_vip
        }

    @staticmethod
    def remove_from_all_queues(user_id_str: str):
        rd = _get_redis()
        try:
            rd.lrem(QUEUE_ALL, 0, user_id_str)
            rd.lrem(QUEUE_MALE, 0, user_id_str)
            rd.lrem(QUEUE_FEMALE, 0, user_id_str)
        except Exception as e:
            logger.error(f"Error removing from queues: {e}")

    @classmethod
    def join_queue(cls, user: User, filters: dict) -> dict:
        rd = _get_redis()
        user_id_str = str(user.id)
        preferred_gender = filters.get("genderPref")
        if preferred_gender is None:
            preferred_gender = filters.get("preferredGender")

        # Determine target queue to find a match
        # Support both 2 (female) and 1/0 (male) as sent by Expo Web and Native
        target_queue = QUEUE_ALL
        if preferred_gender is not None:
            pref_str = str(preferred_gender).lower()
            if pref_str in ('2', 'female') or preferred_gender == 2:
                target_queue = QUEUE_FEMALE
            elif pref_str in ('0', '1', 'male') or preferred_gender in (0, 1):
                target_queue = QUEUE_MALE

        # Run atomic Lua pop to find candidate in <2ms
        candidate_id_str = rd.eval(LUA_POP_CANDIDATE, 1, target_queue, user_id_str)

        if candidate_id_str:
            partner_id = uuid.UUID(candidate_id_str)
            # Check block status
            blocked = UserBlock.objects.filter(
                models_q_block(user.id, partner_id)
            ).exists()

            # Check recent rematch cooldown (prevent endless rematch loop with same skipped person)
            is_recent = rd.exists(f"match:recent:{user_id_str}:{candidate_id_str}")

            if not blocked and not is_recent:
                partner = User.objects.filter(id=partner_id).first()
                if partner:
                    return cls._create_match(user, partner)

            # If blocked or recent, re-push candidate back to queue
            candidate_partner = User.objects.filter(id=partner_id).first()
            if candidate_partner:
                cls._push_user_to_queue(candidate_id_str, candidate_partner.gender)

        # No match found yet: Push current user to queue
        # If user is boosted or VIP, push to FRONT of queue for top priority!
        boosted, _ = cls.is_boosted(user.id)
        cls._push_user_to_queue(user_id_str, user.gender, at_front=(boosted or user.is_vip))
        publish_to_centrifugo(f"users:{user.id}", "QueueJoined", {})
        return {"status": "queued"}

    @classmethod
    def _push_user_to_queue(cls, user_id_str: str, user_gender: int, at_front: bool = False):
        rd = _get_redis()
        cls.remove_from_all_queues(user_id_str)
        push_fn = rd.lpush if at_front else rd.rpush

        push_fn(QUEUE_ALL, user_id_str)
        # 0: Male, 1 or 2: Female
        if user_gender == 0:
            push_fn(QUEUE_MALE, user_id_str)
        else:
            push_fn(QUEUE_FEMALE, user_id_str)

    @classmethod
    def _create_match(cls, user_a: User, user_b: User) -> dict:
        rd = _get_redis()
        user_a_id_str = str(user_a.id)
        user_b_id_str = str(user_b.id)

        # Clean from all queues
        cls.remove_from_all_queues(user_a_id_str)
        cls.remove_from_all_queues(user_b_id_str)

        room_name = new_room_name()
        server_url = settings.LIVEKIT_PUBLIC_URL

        token_a = generate_livekit_token(user_a.id, user_a.name, room_name)
        token_b = generate_livekit_token(user_b.id, user_b.name, room_name)

        # Store active sessions in Redis
        rd.setex(f"match:active:{user_a_id_str}", 3600, room_name)
        rd.setex(f"match:active:{user_b_id_str}", 3600, room_name)
        rd.setex(f"match:partner:{user_a_id_str}", 3600, user_b_id_str)
        rd.setex(f"match:partner:{user_b_id_str}", 3600, user_a_id_str)

        # Cooldown against instant rematch (30 seconds)
        rd.setex(f"match:recent:{user_a_id_str}:{user_b_id_str}", 30, "1")
        rd.setex(f"match:recent:{user_b_id_str}:{user_a_id_str}", 30, "1")

        # Save match session in DB
        MatchSession.objects.create(
            user1_id=user_a.id,
            user2_id=user_b.id,
            livekit_room_name=room_name
        )

        user_a.total_matches += 1
        user_a.save(update_fields=['total_matches'])
        user_b.total_matches += 1
        user_b.save(update_fields=['total_matches'])

        partner_dto_for_a = {
            "id": user_b.id,
            "name": user_b.name,
            "profileImageUrl": user_b.profile_image_url,
            "age": user_b.age,
            "location": user_b.location,
            "gender": user_b.gender,
            "interests": user_b.interests_list,
            "isVip": user_b.is_vip
        }

        partner_dto_for_b = {
            "id": user_a.id,
            "name": user_a.name,
            "profileImageUrl": user_a.profile_image_url,
            "age": user_a.age,
            "location": user_a.location,
            "gender": user_a.gender,
            "interests": user_a.interests_list,
            "isVip": user_a.is_vip
        }

        match_a_payload = {
            "roomName": room_name,
            "liveKitToken": token_a,
            "liveKitServerUrl": server_url,
            "matchedUser": partner_dto_for_a
        }

        match_b_payload = {
            "roomName": room_name,
            "liveKitToken": token_b,
            "liveKitServerUrl": server_url,
            "matchedUser": partner_dto_for_b
        }

        # Publish instantly via Centrifugo
        publish_to_centrifugo(f"users:{user_a.id}", "MatchFound", match_a_payload)
        publish_to_centrifugo(f"users:{user_b.id}", "MatchFound", match_b_payload)

        logger.info(f"Matched {user_a.name} <-> {user_b.name} in room {room_name}")
        return {
            "status": "matched",
            "roomName": room_name,
            "liveKitToken": token_a,
            "liveKitServerUrl": server_url,
            "matchedUser": partner_dto_for_a,
            "match": match_a_payload
        }

    @classmethod
    def leave_queue(cls, user_id: uuid.UUID):
        rd = _get_redis()
        user_id_str = str(user_id)
        partner_id_str = rd.get(f"match:partner:{user_id_str}")
        if partner_id_str:
            publish_to_centrifugo(f"users:{partner_id_str}", "MatchSkipped", {})
            rd.delete(f"match:active:{partner_id_str}", f"match:partner:{partner_id_str}")

        rd.delete(f"match:active:{user_id_str}", f"match:partner:{user_id_str}")
        cls.remove_from_all_queues(user_id_str)
        publish_to_centrifugo(f"users:{user_id}", "QueueLeft", {})

    @classmethod
    def skip(cls, user: User) -> dict:
        rd = _get_redis()
        user_id_str = str(user.id)
        partner_id_str = rd.get(f"match:partner:{user_id_str}")
        if partner_id_str:
            publish_to_centrifugo(f"users:{partner_id_str}", "MatchSkipped", {})
            # Set cooldown for both sides
            rd.setex(f"match:recent:{user_id_str}:{partner_id_str}", 30, "1")
            rd.setex(f"match:recent:{partner_id_str}:{user_id_str}", 30, "1")
            rd.delete(f"match:active:{partner_id_str}", f"match:partner:{partner_id_str}")

        rd.delete(f"match:active:{user_id_str}", f"match:partner:{user_id_str}")
        cls.remove_from_all_queues(user_id_str)
        return cls.join_queue(user, {})

def models_q_block(id1, id2):
    from django.db.models import Q
    return (Q(blocker_id=id1, blocked_user_id=id2) | Q(blocker_id=id2, blocked_user_id=id1))
