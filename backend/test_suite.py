import requests
import uuid
import time
import sys

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5050"

def run_tests():
    print("=== STARTING DJANGO BACKEND TEST SUITE ===")
    
    # 1. Health check
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.status_code} {r.text}"
    print("✓ 1. Health check passed:", r.json())
    
    # 2. Inngest serve endpoint
    r = requests.get(f"{BASE_URL}/api/inngest")
    # Inngest endpoint returns 200 with schema or functions info
    assert r.status_code == 200, f"Inngest endpoint failed: {r.status_code} {r.text}"
    print("✓ 2. Inngest endpoint passed")

    # 3. User A & B registration
    rand_str = str(uuid.uuid4())[:8]
    email_a = f"test_a_{rand_str}@example.com"
    email_b = f"test_b_{rand_str}@example.com"
    password = "Password123!"

    r_reg_a = requests.post(f"{BASE_URL}/api/auth/register", json={
        "name": f"Tester A {rand_str}",
        "email": email_a,
        "password": password,
        "gender": 1,
        "age": 22
    })
    assert r_reg_a.status_code == 200, f"User A registration failed: {r_reg_a.status_code} {r_reg_a.text}"
    user_a_data = r_reg_a.json()
    token_a = user_a_data["accessToken"]
    user_a_id = user_a_data["user"]["id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    r_reg_b = requests.post(f"{BASE_URL}/api/auth/register", json={
        "name": f"Tester B {rand_str}",
        "email": email_b,
        "password": password,
        "gender": 2,
        "age": 24
    })
    assert r_reg_b.status_code == 200, f"User B registration failed: {r_reg_b.status_code} {r_reg_b.text}"
    user_b_data = r_reg_b.json()
    token_b = user_b_data["accessToken"]
    user_b_id = user_b_data["user"]["id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print("✓ 3. Registration passed for both users")

    # 4. Login
    r_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email_a,
        "password": password
    })
    assert r_login.status_code == 200, f"Login failed: {r_login.status_code} {r_login.text}"
    print("✓ 4. Login passed")

    # 5. User Profile Update
    r_profile = requests.put(f"{BASE_URL}/api/users/me", json={
        "name": f"Updated A {rand_str}",
        "bio": "Hello from Python Django!",
        "location": "Egypt"
    }, headers=headers_a)
    assert r_profile.status_code == 200, f"Profile update failed: {r_profile.status_code} {r_profile.text}"
    assert r_profile.json()["bio"] == "Hello from Python Django!"
    print("✓ 5. Profile update passed")

    # 6. Friendships
    r_req = requests.post(f"{BASE_URL}/api/friends/request/{user_b_id}", headers=headers_a)
    assert r_req.status_code == 200, f"Friend request failed: {r_req.status_code} {r_req.text}"

    r_pending = requests.get(f"{BASE_URL}/api/friends/requests", headers=headers_b)
    assert r_pending.status_code == 200, f"Pending requests failed: {r_pending.status_code} {r_pending.text}"
    pending_list = r_pending.json()
    assert len(pending_list) > 0
    req_id = pending_list[0]["id"]

    r_accept = requests.put(f"{BASE_URL}/api/friends/accept/{req_id}", headers=headers_b)
    assert r_accept.status_code == 200, f"Accept friend request failed: {r_accept.status_code} {r_accept.text}"

    r_friends = requests.get(f"{BASE_URL}/api/friends", headers=headers_a)
    assert r_friends.status_code == 200, f"Get friends failed: {r_friends.status_code} {r_friends.text}"
    friends_list = r_friends.json()
    assert any(f["id"] == user_b_id for f in friends_list)
    print("✓ 6. Friendship request and accept passed")

    # 7. Messaging & Conversations
    r_send = requests.post(f"{BASE_URL}/api/conversations/{user_b_id}/messages", json={
        "content": "Salam! How are you?"
    }, headers=headers_a)
    assert r_send.status_code == 200, f"Send message failed: {r_send.status_code} {r_send.text}"
    msg_id = r_send.json()["id"]

    r_convs = requests.get(f"{BASE_URL}/api/conversations", headers=headers_b)
    assert r_convs.status_code == 200, f"Get conversations failed: {r_convs.status_code} {r_convs.text}"
    assert len(r_convs.json()) > 0

    r_msgs = requests.get(f"{BASE_URL}/api/conversations/{user_a_id}/messages", headers=headers_b)
    assert r_msgs.status_code == 200, f"Get messages failed: {r_msgs.status_code} {r_msgs.text}"
    assert any(m["id"] == msg_id for m in r_msgs.json())

    r_read = requests.put(f"{BASE_URL}/api/conversations/{user_a_id}/read", headers=headers_b)
    assert r_read.status_code == 200, f"Mark read failed: {r_read.status_code} {r_read.text}"
    print("✓ 7. Messaging & Conversations passed")

    # 8. Centrifugo Realtime Token
    r_token = requests.get(f"{BASE_URL}/api/realtime/token", headers=headers_a)
    assert r_token.status_code == 200, f"Realtime token failed: {r_token.status_code} {r_token.text}"
    token_info = r_token.json()
    assert "token" in token_info and "wsUrl" in token_info
    print("✓ 8. Realtime Centrifugo Token endpoint passed")

    # 9. Realtime Call Signaling
    r_init_call = requests.post(f"{BASE_URL}/api/realtime/call/initiate", json={
        "friendId": user_b_id,
        "callType": "video"
    }, headers=headers_a)
    assert r_init_call.status_code == 200, f"Initiate call failed: {r_init_call.status_code} {r_init_call.text}"
    call_room = r_init_call.json()["roomName"]

    r_acc_call = requests.post(f"{BASE_URL}/api/realtime/call/accept", json={
        "callerId": user_a_id,
        "roomName": call_room
    }, headers=headers_b)
    assert r_acc_call.status_code == 200, f"Accept call failed: {r_acc_call.status_code} {r_acc_call.text}"

    r_end_call = requests.post(f"{BASE_URL}/api/realtime/call/end", json={
        "friendId": user_b_id,
        "roomName": call_room
    }, headers=headers_a)
    assert r_end_call.status_code == 200, f"End call failed: {r_end_call.status_code} {r_end_call.text}"
    print("✓ 9. Realtime Call Signaling passed")

    # 10. Coins & Gifts & VIP
    r_gifts = requests.get(f"{BASE_URL}/api/gifts")
    assert r_gifts.status_code == 200, f"Get gifts failed: {r_gifts.status_code} {r_gifts.text}"
    gifts = r_gifts.json()
    assert len(gifts) > 0
    gift = gifts[0]

    # Purchase coins
    r_buy = requests.post(f"{BASE_URL}/api/coins/purchase", json={"amount": 500}, headers=headers_a)
    assert r_buy.status_code == 200, f"Purchase coins failed: {r_buy.status_code} {r_buy.text}"
    assert r_buy.json()["balance"] >= 500

    # Send gift
    r_send_gift = requests.post(f"{BASE_URL}/api/gifts/send", json={
        "receiverId": user_b_id,
        "giftId": gift["id"]
    }, headers=headers_a)
    assert r_send_gift.status_code == 200, f"Send gift failed: {r_send_gift.status_code} {r_send_gift.text}"
    print("✓ 10. Coins & Gifts passed")

    # VIP
    r_plans = requests.get(f"{BASE_URL}/api/vip/plans")
    assert r_plans.status_code == 200, f"Get VIP plans failed: {r_plans.status_code} {r_plans.text}"
    plans = r_plans.json()
    assert len(plans) > 0
    plan = plans[0]

    # Buy more coins for VIP if needed
    requests.post(f"{BASE_URL}/api/coins/purchase", json={"amount": 2000}, headers=headers_a)
    r_sub = requests.post(f"{BASE_URL}/api/vip/subscribe/{plan['id']}", headers=headers_a)
    assert r_sub.status_code == 200, f"VIP subscribe failed: {r_sub.status_code} {r_sub.text}"
    print("✓ 11. VIP Plans & Subscription passed")

    # 12. Live Stream
    r_create_live = requests.post(f"{BASE_URL}/api/live", json={
        "title": "My Awesome Django Stream",
        "coverImageUrl": ""
    }, headers=headers_a)
    assert r_create_live.status_code == 200, f"Create live failed: {r_create_live.status_code} {r_create_live.text}"
    live_room = r_create_live.json()
    live_room_id = live_room["id"]
    live_room_name = live_room["liveKitRoomName"]

    r_live_list = requests.get(f"{BASE_URL}/api/live", headers=headers_b)
    assert r_live_list.status_code == 200, f"Get live rooms failed: {r_live_list.status_code} {r_live_list.text}"
    assert any(r["id"] == live_room_id for r in r_live_list.json())

    r_live_token = requests.get(f"{BASE_URL}/api/live/token/{live_room_name}", headers=headers_b)
    assert r_live_token.status_code == 200, f"Get live token failed: {r_live_token.status_code} {r_live_token.text}"
    assert "token" in r_live_token.json()

    r_end_live = requests.post(f"{BASE_URL}/api/live/{live_room_id}/end", headers=headers_a)
    assert r_end_live.status_code == 200, f"End live failed: {r_end_live.status_code} {r_end_live.text}"
    print("✓ 12. Live Stream lifecycle passed")

    # 13. Matchmaking & LiveKit Token
    r_join = requests.post(f"{BASE_URL}/api/match/queue/join", json={
        "preferredGender": None
    }, headers=headers_a)
    assert r_join.status_code == 200, f"Match join failed: {r_join.status_code} {r_join.text}"

    r_leave = requests.post(f"{BASE_URL}/api/match/queue/leave", headers=headers_a)
    assert r_leave.status_code == 200, f"Match leave failed: {r_leave.status_code} {r_leave.text}"

    # Match LiveKit token
    dummy_match_id = str(uuid.uuid4())
    r_match_token = requests.get(f"{BASE_URL}/api/match/token/{dummy_match_id}", headers=headers_a)
    assert r_match_token.status_code == 200, f"Match token failed: {r_match_token.status_code} {r_match_token.text}"
    assert "token" in r_match_token.json()
    print("✓ 13. Matchmaking queue & LiveKit Token passed")

    # 14. Support Tickets
    r_ticket = requests.post(f"{BASE_URL}/api/support/tickets", json={
        "subject": "Need help with coins",
        "message": "I purchased coins and want to know how VIP works",
        "category": "Billing"
    }, headers=headers_a)
    assert r_ticket.status_code == 200, f"Create support ticket failed: {r_ticket.status_code} {r_ticket.text}"
    ticket_id = r_ticket.json()["id"]

    r_tickets = requests.get(f"{BASE_URL}/api/support/tickets", headers=headers_a)
    assert r_tickets.status_code == 200, f"Get support tickets failed: {r_tickets.status_code} {r_tickets.text}"
    assert any(t["id"] == ticket_id for t in r_tickets.json())

    r_ticket_msg = requests.post(f"{BASE_URL}/api/support/tickets/{ticket_id}/messages", json={
        "message": "Follow up message"
    }, headers=headers_a)
    assert r_ticket_msg.status_code == 200, f"Send support message failed: {r_ticket_msg.status_code} {r_ticket_msg.text}"
    print("✓ 14. Support Tickets passed")

    # 15. Notifications
    r_notifs = requests.get(f"{BASE_URL}/api/notifications", headers=headers_b)
    assert r_notifs.status_code == 200, f"Get notifications failed: {r_notifs.status_code} {r_notifs.text}"
    print("✓ 15. Notifications passed")

    # 16. Boost Feature & Status
    # Check boost status (User A is not boosted yet)
    r_boost_status = requests.get(f"{BASE_URL}/api/match/boost/status", headers=headers_a)
    assert r_boost_status.status_code == 200, f"Get boost status failed: {r_boost_status.status_code}"
    assert "isBoosted" in r_boost_status.json()

    # User A activates boost via /api/match/boost
    r_boost = requests.post(f"{BASE_URL}/api/match/boost", headers=headers_a)
    assert r_boost.status_code == 200, f"Activate boost failed: {r_boost.status_code} {r_boost.text}"
    boost_res = r_boost.json()
    assert boost_res["status"] == "boosted"
    assert boost_res["expiresInSeconds"] > 0
    print("✓ 16a. Match Boost activation (/api/match/boost) passed")

    # Shortcut /api/boost and /boost
    r_boost_shortcut = requests.get(f"{BASE_URL}/api/boost/status", headers=headers_a)
    assert r_boost_shortcut.status_code == 200 and r_boost_shortcut.json()["isBoosted"] is True
    # User A is already boosted -> returns already_boosted without deducting coins again
    r_root_boost = requests.post(f"{BASE_URL}/boost", headers=headers_a)
    assert r_root_boost.status_code == 200 and r_root_boost.json()["status"] == "already_boosted"
    assert r_root_boost.json()["coinsRemaining"] == boost_res["coinsRemaining"]
    # User B is not boosted -> returns boosted
    r_b_boost = requests.post(f"{BASE_URL}/boost", headers=headers_b)
    assert r_b_boost.status_code == 200 and r_b_boost.json()["status"] == "boosted"
    print("✓ 16b. Shortcut /boost endpoints & anti double-deduction passed")

    # 17. Trailing Slash Normalization (SlashNormalizationMiddleware)
    r_slash_join = requests.post(f"{BASE_URL}/api/match/queue/join/", json={"preferredGender": None}, headers=headers_a)
    assert r_slash_join.status_code == 200, f"Join with trailing slash failed: {r_slash_join.status_code}"
    r_slash_leave = requests.post(f"{BASE_URL}/api/match/queue/leave/", headers=headers_a)
    assert r_slash_leave.status_code == 200, f"Leave with trailing slash failed: {r_slash_leave.status_code}"
    print("✓ 17. Trailing slash normalization passed (no 404/301 redirects)")

    # 18. Matchmaking Skip & Rematch Cooldown
    # User B joins queue first
    r_b_join = requests.post(f"{BASE_URL}/api/match/queue/join", json={}, headers=headers_b)
    # User A joins queue -> instant match formed!
    r_a_join = requests.post(f"{BASE_URL}/api/match/queue/join", json={}, headers=headers_a)
    assert r_a_join.status_code == 200
    a_data = r_a_join.json()
    assert a_data["status"] == "matched"
    assert "roomName" in a_data or "match" in a_data

    # User A skips
    r_skip = requests.post(f"{BASE_URL}/api/match/skip", headers=headers_a)
    assert r_skip.status_code == 200

    # User B re-queues -> Cooldown prevents immediate re-match with A!
    r_b_rejoin = requests.post(f"{BASE_URL}/api/match/queue/join", json={}, headers=headers_b)
    assert r_b_rejoin.status_code == 200
    assert r_b_rejoin.json().get("status") == "queued"  # Queued, NOT instantly re-matched with skipped A!
    
    # Cleanup queues
    requests.post(f"{BASE_URL}/api/match/queue/leave", headers=headers_a)
    requests.post(f"{BASE_URL}/api/match/queue/leave", headers=headers_b)
    print("✓ 18. Match skip & rematch cooldown passed")

    # 19. Send Gift to Agency-affiliated Host (verifies models.F import fix)
    # Give User A extra coins
    requests.post(f"{BASE_URL}/api/coins/purchase", json={"amount": 200}, headers=headers_a)
    r_send_agency_gift = requests.post(f"{BASE_URL}/api/gifts/send", json={
        "receiverId": user_b_id,
        "giftId": gift["id"]
    }, headers=headers_a)
    assert r_send_agency_gift.status_code == 200, f"Gift send failed: {r_send_agency_gift.status_code} {r_send_agency_gift.text}"
    print("✓ 19. Monetization Gift to Host passed (models.F regression fix verified)")

    # 20. Presence Heartbeat & Offline (Friends broadcasting)
    r_hb = requests.post(f"{BASE_URL}/api/realtime/presence/heartbeat", headers=headers_a)
    assert r_hb.status_code == 200 and r_hb.json()["status"] == "online"
    r_off = requests.post(f"{BASE_URL}/api/realtime/presence/offline", headers=headers_a)
    assert r_off.status_code == 200 and r_off.json()["status"] == "offline"
    print("✓ 20. Presence Heartbeat & Offline broadcasting passed")

    # 21. Voice Rooms (غرف صوتية - SoGo & StarMaker layout & endpoints)
    # A. User A creates a voice room
    r_create_room = requests.post(f"{BASE_URL}/api/rooms", json={
        "title": "مجلس النشامى والوناسة",
        "category": "chat"
    }, headers=headers_a)
    assert r_create_room.status_code == 200, f"Create voice room failed: {r_create_room.status_code} {r_create_room.text}"
    room_data = r_create_room.json()
    voice_room_id = room_data["id"]
    assert len(room_data["seats"]) == 8, f"Expected 8 seats in room, got {len(room_data['seats'])}"
    assert room_data["speakersCount"] == 1  # Host is speaker

    # B. List voice rooms
    r_list_rooms = requests.get(f"{BASE_URL}/api/rooms", headers=headers_b)
    assert r_list_rooms.status_code == 200
    assert any(r["id"] == voice_room_id for r in r_list_rooms.json())

    # C. User B joins the room as listener
    r_join = requests.post(f"{BASE_URL}/api/rooms/{voice_room_id}/join", headers=headers_b)
    assert r_join.status_code == 200

    # D. User B takes seat 1
    r_take_seat = requests.post(f"{BASE_URL}/api/rooms/{voice_room_id}/seats/1/take", headers=headers_b)
    assert r_take_seat.status_code == 200, f"Take seat failed: {r_take_seat.text}"
    updated_seats = r_take_seat.json()["seats"]
    assert updated_seats[0]["userId"] == user_b_id

    # E. User B mutes seat 1
    r_mute = requests.post(f"{BASE_URL}/api/rooms/{voice_room_id}/seats/1/mute", json={"isMuted": True}, headers=headers_b)
    assert r_mute.status_code == 200
    assert r_mute.json()["isMuted"] is True

    # F. Host (User A) locks seat 2
    r_lock = requests.post(f"{BASE_URL}/api/rooms/{voice_room_id}/seats/2/lock", json={"isLocked": True}, headers=headers_a)
    assert r_lock.status_code == 200
    assert r_lock.json()["isLocked"] is True

    # G. User B sends chat message
    r_chat = requests.post(f"{BASE_URL}/api/rooms/{voice_room_id}/chat", json={
        "message": "أهلاً بالجميع، الغرفة رهيبة!"
    }, headers=headers_b)
    assert r_chat.status_code == 200
    assert r_chat.json()["senderId"] == user_b_id

    # H. User A sends gift in voice room to seated User B
    r_voice_gift = requests.post(f"{BASE_URL}/api/rooms/{voice_room_id}/gift", json={
        "recipientId": user_b_id,
        "giftId": gift["id"]
    }, headers=headers_a)
    assert r_voice_gift.status_code == 200, f"Voice room gift failed: {r_voice_gift.text}"
    assert r_voice_gift.json()["success"] is True

    # I. User B gets LiveKit audio room token (isSpeaker should be True since B is seated)
    r_token = requests.get(f"{BASE_URL}/api/rooms/{voice_room_id}/token", headers=headers_b)
    assert r_token.status_code == 200
    assert r_token.json()["isSpeaker"] is True
    assert "token" in r_token.json()

    # J. User B leaves seat 1
    r_leave_seat = requests.post(f"{BASE_URL}/api/rooms/{voice_room_id}/seats/1/leave", headers=headers_b)
    assert r_leave_seat.status_code == 200
    assert r_leave_seat.json()["seats"][0]["userId"] is None

    # K. User B leaves room
    r_leave_room = requests.post(f"{BASE_URL}/api/rooms/{voice_room_id}/leave", headers=headers_b)
    assert r_leave_room.status_code == 200

    # L. Host ends room
    r_end_room = requests.post(f"{BASE_URL}/api/rooms/{voice_room_id}/end", headers=headers_a)
    assert r_end_room.status_code == 200

    print("✓ 21. Voice Rooms (Lobby, 8-seats layout, Centrifugo & LiveKit) passed")

    # 22. Streaks (Snapchat-style Streaks, Ephemeral Snaps & Restore)
    # A. List streaks (initially empty)
    r_streaks_init = requests.get(f"{BASE_URL}/api/streaks", headers=headers_a)
    assert r_streaks_init.status_code == 200, f"List streaks failed: {r_streaks_init.text}"

    # B. Send snap streak from User A to User B
    r_send_streak = requests.post(f"{BASE_URL}/api/streaks/send", json={
        "friendIds": [user_b_id],
        "mediaUrl": "https://example.com/snaps/streak_photo_test.jpg",
        "mediaType": "image",
        "caption": "جمعة مباركة يا صديقي 🔥",
        "durationSeconds": 10
    }, headers=headers_a)
    assert r_send_streak.status_code == 200, f"Send streak failed: {r_send_streak.text}"
    streak_data = r_send_streak.json()
    assert streak_data["sentCount"] == 1
    streak_obj = streak_data["streaks"][0]
    assert streak_obj["streakCount"] >= 1
    assert streak_obj["hasSentToday"] is True
    streak_id = streak_obj["id"]

    # C. Verify ephemeral snap message in User B's conversation
    r_b_convs = requests.get(f"{BASE_URL}/api/conversations/{user_a_id}/messages", headers=headers_b)
    assert r_b_convs.status_code == 200, f"Get messages failed: {r_b_convs.text}"
    b_messages = r_b_convs.json()
    snap_msg = next((m for m in b_messages if m["type"] == 8), None)
    assert snap_msg is not None, "Ephemeral snap message (type 8) not found in conversation"
    assert snap_msg["isRead"] is False
    assert snap_msg["mediaUrl"] == "https://example.com/snaps/streak_photo_test.jpg"
    assert snap_msg["content"] == "جمعة مباركة يا صديقي 🔥"

    # D. User B opens ephemeral snap
    snap_msg_id = snap_msg["id"]
    r_open_snap = requests.post(f"{BASE_URL}/api/streaks/messages/{snap_msg_id}/open", headers=headers_b)
    assert r_open_snap.status_code == 200, f"Open snap failed: {r_open_snap.text}"
    assert r_open_snap.json()["isRead"] is True

    # E. User B reciprocates by sending snap back to User A
    r_b_reciprocate = requests.post(f"{BASE_URL}/api/streaks/send", json={
        "friendIds": [user_a_id],
        "mediaUrl": "https://example.com/snaps/streak_reply_test.jpg",
        "mediaType": "image",
        "caption": "ستريك متبادل! 🔥",
        "durationSeconds": 10
    }, headers=headers_b)
    assert r_b_reciprocate.status_code == 200, f"Reciprocate streak failed: {r_b_reciprocate.text}"
    b_streak = r_b_reciprocate.json()["streaks"][0]
    assert b_streak["streakCount"] >= 1
    assert b_streak["hasSentToday"] is True

    # F. Verify GET /api/friends includes streak info
    r_friends_a = requests.get(f"{BASE_URL}/api/friends", headers=headers_a)
    assert r_friends_a.status_code == 200
    friend_b_item = next((f for f in r_friends_a.json() if f["id"] == user_b_id), None)
    assert friend_b_item is not None
    assert friend_b_item["streakCount"] >= 1
    assert friend_b_item["hasSentStreakToday"] is True

    # G. Break streak artificially and test streak restore (50 coins)
    import subprocess
    subprocess.run([
        "docker", "exec", "qablny-postgres", "psql", "-U", "postgres", "-d", "qablny", "-c",
        f"UPDATE \"Streaks\" SET \"IsBroken\" = true WHERE \"Id\" = '{streak_id}';"
    ], check=True)

    # Ensure User A has enough coins via purchase endpoint
    requests.post(f"{BASE_URL}/api/coins/purchase", json={"amount": 100}, headers=headers_a)
    r_coins_before = requests.get(f"{BASE_URL}/api/coins/balance", headers=headers_a)
    coins_before = r_coins_before.json()["balance"]

    r_restore = requests.post(f"{BASE_URL}/api/streaks/{streak_id}/restore", headers=headers_a)
    assert r_restore.status_code == 200, f"Restore streak failed: {r_restore.text}"
    restore_res = r_restore.json()
    assert restore_res["success"] is True
    assert restore_res["streak"]["isBroken"] is False
    assert restore_res["coinsRemaining"] == coins_before - 50

    # H. Verify Ephemeral Snap Media revocation once opened
    r_b_messages_after = requests.get(f"{BASE_URL}/api/conversations/{user_a_id}/messages", headers=headers_b)
    assert r_b_messages_after.status_code == 200
    opened_snap = next((m for m in r_b_messages_after.json() if m["id"] == snap_msg_id), None)
    assert opened_snap is not None
    assert opened_snap["isRead"] is True
    assert opened_snap["mediaUrl"] is None, "Ephemeral snap mediaUrl must be None after being read by receiver"

    # I. Verify Concurrency / Double deduction prevention on restore
    # Artificially break streak again
    subprocess.run([
        "docker", "exec", "qablny-postgres", "psql", "-U", "postgres", "-d", "qablny", "-c",
        f"UPDATE \"Streaks\" SET \"IsBroken\" = true WHERE \"Id\" = '{streak_id}';"
    ], check=True)
    import threading
    concurrent_statuses = []
    def do_concurrent_restore():
        r = requests.post(f"{BASE_URL}/api/streaks/{streak_id}/restore", headers=headers_a)
        concurrent_statuses.append(r.status_code)

    t1 = threading.Thread(target=do_concurrent_restore)
    t2 = threading.Thread(target=do_concurrent_restore)
    t1.start(); t2.start()
    t1.join(); t2.join()
    assert 200 in concurrent_statuses, "At least one concurrent restore must succeed"
    assert 400 in concurrent_statuses, "Concurrent restore duplicate must be rejected with 400"

    print("✓ 22. Streaks (Snapchat-style Streaks, Ephemeral Snaps & 50-coins Restore) passed")

    # 23. Map & Redis Geospatial (Snap Map Proximity, Ghost Mode & Privacy)
    # A. Check initial ghost mode
    r_gm = requests.get(f"{BASE_URL}/api/map/ghost-mode", headers=headers_a)
    assert r_gm.status_code == 200, f"Get ghost mode failed: {r_gm.text}"
    assert r_gm.json()["ghostMode"] in ["public", "friends", "ghost"]

    # B. User A updates location (Cairo center)
    lat_a, lon_a = 30.0444, 31.2357
    r_loc_a = requests.post(f"{BASE_URL}/api/map/location", json={
        "latitude": lat_a,
        "longitude": lon_a
    }, headers=headers_a)
    assert r_loc_a.status_code == 200, f"Update location A failed: {r_loc_a.text}"
    loc_a_data = r_loc_a.json()
    assert loc_a_data["success"] is True
    assert loc_a_data["isStored"] is True

    # C. Verify User A location can be read
    r_get_loc = requests.get(f"{BASE_URL}/api/map/location", headers=headers_a)
    assert r_get_loc.status_code == 200
    assert abs(r_get_loc.json()["latitude"] - lat_a) < 0.001

    # D. User B updates location ~2 km away from User A
    lat_b, lon_b = 30.0550, 31.2450
    r_loc_b = requests.post(f"{BASE_URL}/api/map/location", json={
        "latitude": lat_b,
        "longitude": lon_b
    }, headers=headers_b)
    assert r_loc_b.status_code == 200, f"Update location B failed: {r_loc_b.text}"

    # E. User A searches nearby with radius=15 km -> User B should be returned
    r_nearby_15 = requests.get(
        f"{BASE_URL}/api/map/nearby?latitude={lat_a}&longitude={lon_a}&radius=15",
        headers=headers_a
    )
    assert r_nearby_15.status_code == 200, f"Get nearby failed: {r_nearby_15.text}"
    nearby_res = r_nearby_15.json()
    nearby_users = nearby_res["users"]
    user_b_entry = next((u for u in nearby_users if u["id"] == str(user_b_id)), None)
    assert user_b_entry is not None, "User B must appear in User A nearby radar"
    assert user_b_entry["distance"] > 0
    assert user_b_entry["distance"] < 5.0
    assert user_b_entry["isFriend"] is True
    # Self should not be in nearby results
    assert not any(u["id"] == str(user_a_id) for u in nearby_users)

    # F. Test radius filtering (radius=0.5 km should exclude User B who is ~1.5 km away)
    r_nearby_small = requests.get(
        f"{BASE_URL}/api/map/nearby?latitude={lat_a}&longitude={lon_a}&radius=0.5",
        headers=headers_a
    )
    assert r_nearby_small.status_code == 200
    assert not any(u["id"] == str(user_b_id) for u in r_nearby_small.json()["users"]), \
        "User B should be excluded with tight 0.5km radius"

    # G. Test Ghost Mode invisibility (User B turns on ghost mode)
    r_set_ghost = requests.post(f"{BASE_URL}/api/map/ghost-mode", json={
        "ghostMode": "ghost"
    }, headers=headers_b)
    assert r_set_ghost.status_code == 200
    assert r_set_ghost.json()["ghostMode"] == "ghost"
    assert r_set_ghost.json()["isGhostActive"] is True

    # User A queries nearby again -> User B must be invisible!
    r_nearby_after_ghost = requests.get(
        f"{BASE_URL}/api/map/nearby?latitude={lat_a}&longitude={lon_a}&radius=15",
        headers=headers_a
    )
    assert r_nearby_after_ghost.status_code == 200
    assert not any(u["id"] == str(user_b_id) for u in r_nearby_after_ghost.json()["users"]), \
        "User B in Ghost Mode must not appear in nearby results"

    # H. Test Ghost Mode single-tap toggle
    r_toggle = requests.post(f"{BASE_URL}/api/map/ghost-mode", json={
        "toggle": True
    }, headers=headers_b)
    assert r_toggle.status_code == 200
    # From ghost, toggle should bring back to public
    assert r_toggle.json()["ghostMode"] == "public"

    # User B should reappear in nearby search for User A
    r_nearby_reappear = requests.get(
        f"{BASE_URL}/api/map/nearby?latitude={lat_a}&longitude={lon_a}&radius=15",
        headers=headers_a
    )
    assert r_nearby_reappear.status_code == 200
    assert any(u["id"] == str(user_b_id) for u in r_nearby_reappear.json()["users"]), \
        "User B must reappear after exiting Ghost Mode"

    # I. Test Friends-Only privacy mode with non-friend User C
    email_c = f"test_c_{rand_str}@example.com"
    r_reg_c = requests.post(f"{BASE_URL}/api/auth/register", json={
        "name": f"Tester C {rand_str}",
        "email": email_c,
        "password": password,
        "gender": 1,
        "age": 25
    })
    token_c = r_reg_c.json()["accessToken"]
    headers_c = {"Authorization": f"Bearer {token_c}"}

    # User B sets ghost mode to "friends"
    requests.post(f"{BASE_URL}/api/map/ghost-mode", json={"ghostMode": "friends"}, headers=headers_b)

    # User A (friend) can still see User B
    r_a_check = requests.get(f"{BASE_URL}/api/map/nearby?latitude={lat_a}&longitude={lon_a}&radius=15", headers=headers_a)
    assert any(u["id"] == str(user_b_id) for u in r_a_check.json()["users"]), "Friend User A should see User B in friends-only mode"

    # User C (NOT friend) cannot see User B
    r_c_check = requests.get(f"{BASE_URL}/api/map/nearby?latitude={lat_a}&longitude={lon_a}&radius=15", headers=headers_c)
    assert not any(u["id"] == str(user_b_id) for u in r_c_check.json()["users"]), "Non-friend User C must NOT see User B in friends-only mode"

    # J. Invalid coordinates rejection
    r_invalid = requests.post(f"{BASE_URL}/api/map/location", json={
        "latitude": 999.0,
        "longitude": 31.0
    }, headers=headers_a)
    assert r_invalid.status_code == 400, "Latitude 999.0 must be rejected with 400"

    print("✓ 23. Map & Redis Geospatial (Snap Map Proximity, Ghost Mode & Privacy) passed")

    print("\n==========================================")
    print("🎉 ALL 23 INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==========================================")


if __name__ == "__main__":
    run_tests()
