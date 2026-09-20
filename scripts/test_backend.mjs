/**
 * Automated Test Suite for FridgeFriends FastAPI Backend
 * Target: https://fridge-friends-be-144bbbd9.fastapicloud.dev
 */

const BASE_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://https://fridge-friends-be-144bbbd9.fastapicloud.dev/-friends-be.fastapicloud.dev";

console.log(`\n======================================================`);
console.log(`🧪 FRIDGEFRIENDS BACKEND INTEGRATION TEST`);
console.log(`🔗 Target URL: ${BASE_URL}`);
console.log(`======================================================\n`);

let passedTests = 0;
let totalTests = 0;

async function runTest(title, testFn) {
  totalTests++;
  process.stdout.write(`[Test ${totalTests}] ${title}... `);
  const start = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - start;
    console.log(`✅ PASSED (${duration}ms)`);
    if (result) {
      console.log(`       ↳ ${result}`);
    }
    passedTests++;
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`❌ FAILED (${duration}ms)`);
    console.log(`       ↳ Error: ${err.message}`);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }

  if (res.status === 204) return null;
  return await res.json();
}

async function main() {
  let activeUserId = 14;
  let testItemId = null;
  let testFriendId = 17;
  let allUsers = [];

  // Test 1: Health Check
  await runTest("GET /health (Server Health & Reachability)", async () => {
    const data = await request("/health");
    if (data.status !== "ok")
      throw new Error(`Unexpected status: ${data.status}`);
    return `Server status: "${data.status}"`;
  });

  // Test 2: List Users
  await runTest("GET /users (List Registered Users)", async () => {
    const users = await request("/users");
    if (!Array.isArray(users) || users.length === 0) {
      throw new Error(`Expected non-empty users array`);
    }
    allUsers = users;
    const sam = users.find((u) => u.name.includes("Sam")) || users[0];
    if (sam) activeUserId = sam.id;

    const sample = users.map((u) => `${u.name} (ID: ${u.id})`).join(", ");
    return `Found ${users.length} users: [${sample}] (Active User: ID ${activeUserId})`;
  });

  // Test 3: Get User Details
  await runTest(
    `GET /users/${activeUserId} (Get Active User Profile)`,
    async () => {
      const user = await request(`/users/${activeUserId}`);
      if (user.id !== activeUserId) throw new Error(`User ID mismatch`);
      return `Loaded user: ${user.name} <${user.email}>`;
    },
  );

  // Test 4: List Grocery Items for User
  await runTest(
    `GET /users/${activeUserId}/grocery-items (Fetch User Pantry)`,
    async () => {
      const items = await request(`/users/${activeUserId}/grocery-items`);
      if (!Array.isArray(items))
        throw new Error(`Expected array of grocery items`);
      const names = items
        .slice(0, 3)
        .map((i) => i.name)
        .join(", ");
      return `Retrieved ${items.length} items from database (e.g. ${names}...)`;
    },
  );

  // Test 5: Create Grocery Item
  await runTest(
    `POST /users/${activeUserId}/grocery-items (Add New Item)`,
    async () => {
      const created = await request(`/users/${activeUserId}/grocery-items`, {
        method: "POST",
        body: JSON.stringify({
          name: "Backend Test Mango",
          quantity: 3,
          unit: "ct",
          category: "produce",
          expires_on: "2026-09-28",
          purchased_on: "2026-09-19",
        }),
      });
      if (!created.id || created.name !== "Backend Test Mango") {
        throw new Error(`Failed to create item properly`);
      }
      testItemId = created.id;
      return `Created item ID ${created.id}: ${created.name} (${created.quantity} ${created.unit})`;
    },
  );

  // Test 6: Update Grocery Item
  await runTest(
    `PATCH /grocery-items/{id} (Update Item Quantity & Status)`,
    async () => {
      if (!testItemId) throw new Error(`No test item ID from previous test`);
      const updated = await request(`/grocery-items/${testItemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          quantity: 5,
          consumed: true,
        }),
      });
      if (updated.quantity !== 5 || updated.consumed !== true) {
        throw new Error(`Item update did not persist correctly`);
      }
      return `Updated item ID ${testItemId}: quantity=${updated.quantity}, consumed=${updated.consumed}`;
    },
  );

  // Test 7: Delete Grocery Item
  await runTest(`DELETE /grocery-items/{id} (Clean Up Test Item)`, async () => {
    if (!testItemId) throw new Error(`No test item ID to delete`);
    await request(`/grocery-items/${testItemId}`, { method: "DELETE" });
    return `Successfully deleted item ID ${testItemId} from database`;
  });

  // Test 8: List Expiring Items with Friends
  await runTest(
    `GET /users/${activeUserId}/grocery-items/expiring?include_friends=true (Collaborative Feast Mode Items)`,
    async () => {
      const expiring = await request(
        `/users/${activeUserId}/grocery-items/expiring?within_days=7&include_friends=true`,
      );
      if (!Array.isArray(expiring))
        throw new Error(`Expected array of expiring items`);
      const friendContributors = new Set(expiring.map((i) => i.owner_name));
      return `Retrieved ${expiring.length} expiring items across contributors: [${Array.from(friendContributors).join(", ")}]`;
    },
  );

  // Test 9: List Friends for User
  await runTest(
    `GET /users/${activeUserId}/friends (Check Mutual / Pending Friends)`,
    async () => {
      const friends = await request(`/users/${activeUserId}/friends`);
      if (!Array.isArray(friends)) throw new Error(`Expected array of friends`);
      const friendIds = friends.map((f) => f.friend_id || f.friend?.id);
      const nonFriend = allUsers.find(
        (u) => u.id !== activeUserId && !friendIds.includes(u.id),
      );
      if (nonFriend) {
        testFriendId = nonFriend.id;
      }
      const friendList = friends
        .map((f) => `${f.friend?.name} (${f.status})`)
        .join(", ");
      return `User ${activeUserId} has ${friends.length} friendships: [${friendList}] (Test 10 Friend target: ${nonFriend ? nonFriend.name : "ID " + testFriendId})`;
    },
  );

  // Test 10: Friend Request Lifecycle (Add, Accept, Remove)
  await runTest(
    `POST / PATCH / DELETE /users/${activeUserId}/friends (Friend Request Lifecycle)`,
    async () => {
      // 1. Add friend
      const added = await request(`/users/${activeUserId}/friends`, {
        method: "POST",
        body: JSON.stringify({ friend_id: testFriendId }),
      });
      if (added.status !== "pending")
        throw new Error(`Expected pending status on creation`);

      // 2. Accept friend
      const accepted = await request(
        `/users/${activeUserId}/friends/${testFriendId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "accepted" }),
        },
      );
      if (accepted.status !== "accepted")
        throw new Error(`Expected accepted status`);

      // 3. Remove friend
      await request(`/users/${activeUserId}/friends/${testFriendId}`, {
        method: "DELETE",
      });

      return `Successfully tested full friendship lifecycle (pending -> accepted -> deleted)`;
    },
  );

  let createdFeastId = null;

  // Test 11: List Feasts for User
  await runTest(
    `GET /users/${activeUserId}/feasts (Fetch User Hosted / Attending Feasts)`,
    async () => {
      const feasts = await request(`/users/${activeUserId}/feasts`);
      if (!Array.isArray(feasts)) throw new Error(`Expected array of feasts`);
      const feastNames = feasts
        .map((f) => `"${f.name}" (ID ${f.id})`)
        .join(", ");
      return `Retrieved ${feasts.length} feasts: [${feastNames || "None currently"}]`;
    },
  );

  // Test 12: Create Feast Party
  await runTest(
    `POST /feasts (Create Feast Party with Attendees & Recipe)`,
    async () => {
      const attendeeUsers = allUsers
        .filter((u) => u.id !== activeUserId)
        .slice(0, 2);
      const attendeeIds = attendeeUsers.map((u) => u.id);

      const feastPayload = {
        name: `Backend Test Cook-Off (${Date.now().toString().slice(-4)})`,
        host_id: activeUserId,
        recipe: {
          rank: 1,
          rank_reason: "Top match pooling expiring spinach and avocado",
          name: "Crispy Veggie Hash & Herb Skillet",
          cuisine: "Fusion",
          uses: [
            { name: "Spinach", expiring: true, from_users: ["Sam"] },
            { name: "Eggs", expiring: false, from_users: ["Nadia"] },
          ],
          missing: [],
          uses_expiring: ["Spinach"],
          prep_minutes: 10,
          cook_minutes: 20,
          total_minutes: 30,
          contributors: ["Sam", "Nadia"],
          why: "Zero waste collaborative breakfast skillet",
          liked_by: [],
          is_liked: false,
        },
        attendee_ids: attendeeIds,
        scheduled_for: "2026-09-26T18:30:00Z",
      };

      const created = await request("/feasts", {
        method: "POST",
        body: JSON.stringify(feastPayload),
      });

      if (!created.id || !Array.isArray(created.attendees)) {
        throw new Error(`Invalid feast creation response`);
      }

      createdFeastId = created.id;
      return `Created Feast ID ${created.id}: "${created.name}" with ${created.attendees.length} attendees (${created.invitations_sent} sent, ${created.invitations_pending} pending)`;
    },
  );

  // Test 13: Respond / RSVP to Feast
  await runTest(
    `POST /feasts/{id}/respond/{user_id} (RSVP Response: Accepted)`,
    async () => {
      if (!createdFeastId) throw new Error("No test feast ID available");
      const feast = await request(`/feasts/${createdFeastId}`);
      const nonHostAttendee = feast.attendees.find((a) => !a.is_host);
      if (!nonHostAttendee)
        throw new Error("No non-host attendee in test feast");

      const updatedFeast = await request(
        `/feasts/${createdFeastId}/respond/${nonHostAttendee.user_id}`,
        {
          method: "POST",
          body: JSON.stringify({ response: "accepted" }),
        },
      );

      const updatedAttendee = updatedFeast.attendees?.find(
        (a) => a.user_id === nonHostAttendee.user_id,
      );
      if (updatedAttendee?.response !== "accepted") {
        throw new Error(
          `Expected attendee response 'accepted' but got '${updatedAttendee?.response}'`,
        );
      }

      return `Attendee ${updatedAttendee.name} (User ID ${updatedAttendee.user_id}) RSVP set to: ${updatedAttendee.response}`;
    },
  );

  // Test 14: User Notifications (Delivery Audit)
  await runTest(
    `GET /users/${activeUserId}/notifications (Feast Invitation Delivery Audit)`,
    async () => {
      const notifications = await request(
        `/users/${activeUserId}/notifications`,
      );
      if (!Array.isArray(notifications))
        throw new Error("Expected array of notifications");
      const feastNotifs = notifications.filter(
        (n) => n.kind === "feast_invitation" || n.feast_id,
      );
      return `Found ${notifications.length} total notifications (${feastNotifs.length} feast related invitations/updates)`;
    },
  );

  console.log(`\n======================================================`);
  console.log(`📊 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log(`🎉 ALL BACKEND ENDPOINTS ARE FULLY OPERATIONAL!`);
  } else {
    console.log(`⚠️ SOME TESTS FAILED. CHECK LOGS ABOVE.`);
  }
  console.log(`======================================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
