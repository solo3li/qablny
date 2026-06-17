const API_URL = "http://localhost:5000/api";

let tokenA = "";
let tokenB = "";
let userAId = "";
let userBId = "";

const log = (msg) => console.log(`[+] ${msg}`);
const err = (msg, error) => console.error(`[!] ${msg}`, error);

async function request(endpoint, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function runTests() {
  try {
    log("Starting API Tests...");

    // 1. Register Users
    log("Registering User A...");
    const userA = await request("/auth/register", "POST", {
      email: `usera_${Date.now()}@test.com`,
      password: "Password123",
      name: "User A",
      age: 25,
      gender: 0, // Male
      location: "Riyadh"
    });
    tokenA = userA.accessToken;
    userAId = userA.user.id;

    log("Registering User B...");
    const userB = await request("/auth/register", "POST", {
      email: `userb_${Date.now()}@test.com`,
      password: "Password123",
      name: "User B",
      age: 22,
      gender: 1, // Female
      location: "Jeddah"
    });
    tokenB = userB.accessToken;
    userBId = userB.user.id;

    // 2. Profile Update (User A)
    log("Updating User A profile...");
    const updatedA = await request("/users/me", "PUT", {
      bio: "Hello from User A test",
      interests: ["Coding", "Gaming"]
    }, tokenA);
    if (updatedA.bio !== "Hello from User A test") throw new Error("Bio not updated");

    // 3. Friend Request flow
    log("User A sends friend request to User B...");
    await request(`/friends/request/${userBId}`, "POST", null, tokenA);
    
    log("User B gets pending requests...");
    const pending = await request("/friends/requests", "GET", null, tokenB);
    if (!pending.find(p => p.id === userAId)) throw new Error("Friend request not found");

    log("User B accepts friend request...");
    await request(`/friends/accept/${userAId}`, "PUT", null, tokenB);

    log("User A checks friends list...");
    const friends = await request("/friends", "GET", null, tokenA);
    if (!friends.find(f => f.id === userBId)) throw new Error("Friend not added");

    // 4. Messaging
    log("User A sends message to User B...");
    const msg = await request(`/conversations/${userBId}/messages`, "POST", {
      type: 0, // Text
      content: "Hello, how are you?"
    }, tokenA);

    log("User B gets messages...");
    const messages = await request(`/conversations/${userAId}/messages`, "GET", null, tokenB);
    if (!messages.find(m => m.id === msg.id)) throw new Error("Message not received");
    if (messages[0].translation) log(`Translation received: ${messages[0].translation}`);

    log("User B marks messages as read...");
    await request(`/conversations/${userAId}/read`, "PUT", null, tokenB);

    // 5. Monetization (Coins & Gifts)
    log("User A checks coin balance...");
    const balance = await request("/coins/balance", "GET", null, tokenA);
    log(`User A balance: ${balance.balance} coins`);

    log("Getting gifts catalog...");
    const gifts = await request("/gifts", "GET");
    if (gifts.length === 0) throw new Error("No gifts found");
    const giftToSend = gifts[0]; // Cheapest gift

    log(`User A sends gift ${giftToSend.name} to User B...`);
    await request("/gifts/send", "POST", {
      giftId: giftToSend.id,
      receiverId: userBId
    }, tokenA);

    const newBalance = await request("/coins/balance", "GET", null, tokenA);
    log(`User A new balance: ${newBalance.balance} coins (Cost: ${giftToSend.coinCost})`);

    log("User A buys 500 coins...");
    await request("/coins/purchase", "POST", { amount: 500 }, tokenA);
    const finalBalance = await request("/coins/balance", "GET", null, tokenA);
    log(`User A final balance: ${finalBalance.balance} coins`);

    // 6. VIP Subscription
    log("Getting VIP plans...");
    const plans = await request("/vip/plans", "GET");
    if (plans.length > 0) {
      log(`User A subscribes to VIP plan: ${plans[0].name}`);
      await request(`/vip/subscribe/${plans[0].id}`, "POST", null, tokenA);
      const vipStatus = await request("/vip/status", "GET", null, tokenA);
      if (!vipStatus.isVip) throw new Error("VIP status not applied");
      log("VIP subscription successful.");
    }

    // 7. Match API (Get Token)
    log("User A requests LiveKit token for direct call...");
    const callToken = await request("/match/token/test_room", "GET", null, tokenA);
    if (!callToken.token) throw new Error("LiveKit token not generated");
    log("LiveKit Token generated successfully.");

    log("\n✅ ALL ENDPOINTS TESTED SUCCESSFULLY!");
  } catch (e) {
    err("Test failed!", e);
  }
}

runTests();
