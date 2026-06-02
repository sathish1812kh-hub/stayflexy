/**
 * Room module API integration tests.
 * Tests room types and rooms through the REST API layer using Playwright.
 * Run with: npx playwright test src/modules/room/tests/room.test.ts
 */
// FILE: src/modules/room/tests/room.test.ts
import { test, expect, type APIRequestContext } from "@playwright/test";

const BASE_URL = process.env["TEST_BASE_URL"] ?? "http://localhost:3000";
const AUTH_BASE = `${BASE_URL}/api/v1/auth`;
const HOTELS_BASE = `${BASE_URL}/api/v1/hotels`;
const ROOM_TYPES_BASE = `${BASE_URL}/api/v1/room-types`;
const ROOMS_BASE = `${BASE_URL}/api/v1/rooms`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface RegisterResponse {
  data: {
    user: { id: string; organizationId: string; email: string };
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  };
}

interface HotelResponse {
  data: { id: string; name: string; organizationId: string };
}

interface RoomTypeResponse {
  data: { id: string; hotelId: string; organizationId: string; name: string; slug: string; status: string };
}

interface RoomResponse {
  data: { id: string; hotelId: string; roomTypeId: string; roomNumber: string; operationalStatus: string; housekeepingStatus: string };
}

interface PaginatedRoomTypeResponse {
  data: RoomTypeResponse["data"][];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
}

interface PaginatedRoomResponse {
  data: RoomResponse["data"][];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
}

async function registerUser(
  request: APIRequestContext,
  suffix: string
): Promise<{ accessToken: string; organizationId: string; userId: string }> {
  const email = `room-test+${suffix}+${Date.now()}@example.com`;
  const res = await request.post(`${AUTH_BASE}/register`, {
    data: {
      email,
      password: "Password123!",
      firstName: "Room",
      lastName: "Tester",
      organizationName: `Room Org ${suffix}`,
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json() as RegisterResponse;
  return {
    accessToken: body.data.tokens.accessToken,
    organizationId: body.data.user.organizationId,
    userId: body.data.user.id,
  };
}

async function createHotel(
  request: APIRequestContext,
  accessToken: string,
  nameSuffix: string
): Promise<string> {
  const res = await request.post(HOTELS_BASE, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      name: `Test Hotel ${nameSuffix}`,
      category: "HOTEL",
      email: `hotel-${nameSuffix.replace(/[^a-z0-9]/gi, "")}@example.com`,
      phone: "+12025550100",
      addressLine1: "123 Main Street",
      city: "New York",
      country: "US",
      totalRooms: 50,
    },
  });
  // Hotel POST returns 200 with data (successResponse) or 201 depending on the route
  expect([200, 201]).toContain(res.status());
  const body = await res.json() as HotelResponse;
  return body.data.id;
}

// ─── Room Type CRUD tests ─────────────────────────────────────────────────────

test.describe("Room Types", () => {
  let accessToken = "";
  let hotelId = "";
  let roomTypeId = "";

  test.beforeAll(async ({ request }) => {
    const user = await registerUser(request, "rt");
    accessToken = user.accessToken;
    hotelId = await createHotel(request, accessToken, `rt-${Date.now()}`);
  });

  test("POST /room-types — creates a room type", async ({ request }) => {
    const res = await request.post(ROOM_TYPES_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        hotelId,
        name: "Deluxe King Suite",
        maxAdults: 2,
        maxChildren: 1,
        maxOccupancy: 3,
        basePrice: 199.99,
        bedType: "KING",
        amenities: ["WIFI", "TV"],
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as { success: boolean; data: RoomTypeResponse["data"] };
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Deluxe King Suite");
    expect(body.data.hotelId).toBe(hotelId);
    expect(body.data.status).toBe("ACTIVE");
    expect(body.data.slug).toBeTruthy();
    roomTypeId = body.data.id;
  });

  test("POST /room-types — duplicate slug returns 409", async ({ request }) => {
    const res = await request.post(ROOM_TYPES_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        hotelId,
        name: "Deluxe King Suite",
        slug: "deluxe-king-suite",
        maxAdults: 2,
        maxChildren: 0,
        maxOccupancy: 2,
        basePrice: 150.00,
        bedType: "KING",
      },
    });
    // First create a room type with explicit slug
    const first = await request.post(ROOM_TYPES_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        hotelId,
        name: "Unique Suite XYZ",
        slug: "unique-suite-xyz",
        maxAdults: 2,
        maxChildren: 0,
        maxOccupancy: 2,
        basePrice: 200.00,
        bedType: "QUEEN",
      },
    });
    expect(first.status()).toBe(201);

    // Try again with same slug
    const dup = await request.post(ROOM_TYPES_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        hotelId,
        name: "Another Suite",
        slug: "unique-suite-xyz",
        maxAdults: 2,
        maxChildren: 0,
        maxOccupancy: 2,
        basePrice: 180.00,
        bedType: "QUEEN",
      },
    });
    expect(dup.status()).toBe(409);
    const body = await dup.json() as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONFLICT");
    void res;
  });

  test("POST /room-types — missing required fields returns 422", async ({ request }) => {
    const res = await request.post(ROOM_TYPES_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        hotelId,
        // missing: name, maxAdults, maxChildren, maxOccupancy, basePrice, bedType
      },
    });
    expect(res.status()).toBe(422);
    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("GET /room-types?hotelId=X — lists room types with pagination", async ({ request }) => {
    const res = await request.get(`${ROOM_TYPES_BASE}?hotelId=${hotelId}&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { success: boolean; data: PaginatedRoomTypeResponse["data"]; meta: PaginatedRoomTypeResponse["meta"] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toBeDefined();
    expect(typeof body.meta.total).toBe("number");
  });

  test("GET /room-types/:id — returns room type by id", async ({ request }) => {
    const res = await request.get(`${ROOM_TYPES_BASE}/${roomTypeId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { success: boolean; data: RoomTypeResponse["data"] };
    expect(body.data.id).toBe(roomTypeId);
  });

  test("GET /room-types/:id — cross-org access returns 404", async ({ request }) => {
    const otherUser = await registerUser(request, `rt-other-${Date.now()}`);
    const res = await request.get(`${ROOM_TYPES_BASE}/${roomTypeId}`, {
      headers: { Authorization: `Bearer ${otherUser.accessToken}` },
    });
    expect(res.status()).toBe(404);
  });

  test("PATCH /room-types/:id — updates room type", async ({ request }) => {
    const res = await request.patch(`${ROOM_TYPES_BASE}/${roomTypeId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: "Updated Deluxe King Suite",
        basePrice: 249.99,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { success: boolean; data: RoomTypeResponse["data"] };
    expect(body.data.name).toBe("Updated Deluxe King Suite");
  });
});

// ─── Room CRUD tests ──────────────────────────────────────────────────────────

test.describe("Rooms", () => {
  let accessToken = "";
  let hotelId = "";
  let roomTypeId = "";
  let roomId = "";

  test.beforeAll(async ({ request }) => {
    const user = await registerUser(request, `rooms-${Date.now()}`);
    accessToken = user.accessToken;

    // Create hotel
    hotelId = await createHotel(request, accessToken, `rooms-${Date.now()}`);

    // Create room type
    const rtRes = await request.post(ROOM_TYPES_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        hotelId,
        name: "Standard Room",
        maxAdults: 2,
        maxChildren: 0,
        maxOccupancy: 2,
        basePrice: 99.00,
        bedType: "QUEEN",
      },
    });
    expect(rtRes.status()).toBe(201);
    const rtBody = await rtRes.json() as { data: RoomTypeResponse["data"] };
    roomTypeId = rtBody.data.id;
  });

  test("POST /rooms — creates a room", async ({ request }) => {
    const res = await request.post(ROOMS_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        hotelId,
        roomTypeId,
        roomNumber: "101",
        floor: 1,
        view: "Garden",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as { success: boolean; data: RoomResponse["data"] };
    expect(body.success).toBe(true);
    expect(body.data.roomNumber).toBe("101");
    expect(body.data.hotelId).toBe(hotelId);
    expect(body.data.roomTypeId).toBe(roomTypeId);
    expect(body.data.operationalStatus).toBe("AVAILABLE");
    expect(body.data.housekeepingStatus).toBe("CLEAN");
    roomId = body.data.id;
  });

  test("POST /rooms — duplicate room number returns 409", async ({ request }) => {
    const res = await request.post(ROOMS_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        hotelId,
        roomTypeId,
        roomNumber: "101",
        floor: 1,
      },
    });
    expect(res.status()).toBe(409);
    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.error.code).toBe("CONFLICT");
  });

  test("POST /rooms — invalid roomTypeId returns 404", async ({ request }) => {
    const res = await request.post(ROOMS_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        hotelId,
        roomTypeId: "00000000-0000-0000-0000-000000000000",
        roomNumber: "999",
        floor: 1,
      },
    });
    expect(res.status()).toBe(404);
  });

  test("POST /rooms — missing required fields returns 422", async ({ request }) => {
    const res = await request.post(ROOMS_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        hotelId,
        // missing: roomTypeId, roomNumber, floor
      },
    });
    expect(res.status()).toBe(422);
  });

  test("GET /rooms?hotelId=X — lists rooms with pagination", async ({ request }) => {
    const res = await request.get(`${ROOMS_BASE}?hotelId=${hotelId}&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { success: boolean; data: PaginatedRoomResponse["data"]; meta: PaginatedRoomResponse["meta"] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.total).toBeGreaterThanOrEqual(1);
  });

  test("GET /rooms?hotelId=X&operationalStatus=AVAILABLE — filters by status", async ({ request }) => {
    const res = await request.get(
      `${ROOMS_BASE}?hotelId=${hotelId}&operationalStatus=AVAILABLE`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    expect(res.status()).toBe(200);
    const body = await res.json() as { data: PaginatedRoomResponse["data"] };
    expect(Array.isArray(body.data)).toBe(true);
    body.data.forEach((r) => {
      expect(r.operationalStatus).toBe("AVAILABLE");
    });
  });

  test("GET /rooms?hotelId=X&roomTypeId=X — filters by room type", async ({ request }) => {
    const res = await request.get(
      `${ROOMS_BASE}?hotelId=${hotelId}&roomTypeId=${roomTypeId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    expect(res.status()).toBe(200);
    const body = await res.json() as { data: PaginatedRoomResponse["data"] };
    expect(Array.isArray(body.data)).toBe(true);
    body.data.forEach((r) => {
      expect(r.roomTypeId).toBe(roomTypeId);
    });
  });

  test("GET /rooms/:id — returns room by id", async ({ request }) => {
    const res = await request.get(`${ROOMS_BASE}/${roomId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { success: boolean; data: RoomResponse["data"] };
    expect(body.data.id).toBe(roomId);
  });

  test("GET /rooms/:id — cross-org access returns 404", async ({ request }) => {
    const otherUser = await registerUser(request, `rooms-other-${Date.now()}`);
    const res = await request.get(`${ROOMS_BASE}/${roomId}`, {
      headers: { Authorization: `Bearer ${otherUser.accessToken}` },
    });
    expect(res.status()).toBe(404);
  });

  test("PATCH /rooms/:id/status — updates operational status", async ({ request }) => {
    const res = await request.patch(`${ROOMS_BASE}/${roomId}/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        operationalStatus: "OUT_OF_ORDER",
        reason: "Water damage repair",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { success: boolean; data: RoomResponse["data"] };
    expect(body.data.operationalStatus).toBe("OUT_OF_ORDER");
  });

  test("PATCH /rooms/:id/status — updates housekeeping status", async ({ request }) => {
    const res = await request.patch(`${ROOMS_BASE}/${roomId}/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        housekeepingStatus: "DIRTY",
        notes: "Needs deep cleaning",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { success: boolean; data: RoomResponse["data"] };
    expect(body.data.housekeepingStatus).toBe("DIRTY");
  });

  test("PATCH /rooms/:id/status — invalid status returns 422", async ({ request }) => {
    const res = await request.patch(`${ROOMS_BASE}/${roomId}/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { operationalStatus: "INVALID_STATUS" },
    });
    expect(res.status()).toBe(422);
  });
});

// ─── Tenant isolation tests ───────────────────────────────────────────────────

test.describe("Tenant isolation", () => {
  let userAToken = "";
  let userBToken = "";
  let hotelAId = "";
  let roomTypeAId = "";
  let roomAId = "";

  test.beforeAll(async ({ request }) => {
    // Register two independent organizations
    const userA = await registerUser(request, `tenant-a-${Date.now()}`);
    const userB = await registerUser(request, `tenant-b-${Date.now()}`);
    userAToken = userA.accessToken;
    userBToken = userB.accessToken;

    // Create hotel, room type, and room under org A
    hotelAId = await createHotel(request, userAToken, `tenant-a-${Date.now()}`);

    const rtRes = await request.post(ROOM_TYPES_BASE, {
      headers: { Authorization: `Bearer ${userAToken}` },
      data: {
        hotelId: hotelAId,
        name: "Tenant A Suite",
        maxAdults: 2,
        maxChildren: 0,
        maxOccupancy: 2,
        basePrice: 300.00,
        bedType: "KING",
      },
    });
    expect(rtRes.status()).toBe(201);
    const rtBody = await rtRes.json() as { data: RoomTypeResponse["data"] };
    roomTypeAId = rtBody.data.id;

    const roomRes = await request.post(ROOMS_BASE, {
      headers: { Authorization: `Bearer ${userAToken}` },
      data: {
        hotelId: hotelAId,
        roomTypeId: roomTypeAId,
        roomNumber: "T001",
        floor: 1,
      },
    });
    expect(roomRes.status()).toBe(201);
    const roomBody = await roomRes.json() as { data: RoomResponse["data"] };
    roomAId = roomBody.data.id;
  });

  test("org B cannot read org A room type by id", async ({ request }) => {
    const res = await request.get(`${ROOM_TYPES_BASE}/${roomTypeAId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    expect(res.status()).toBe(404);
  });

  test("org B cannot read org A room by id", async ({ request }) => {
    const res = await request.get(`${ROOMS_BASE}/${roomAId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    expect(res.status()).toBe(404);
  });

  test("org B cannot update org A room type", async ({ request }) => {
    const res = await request.patch(`${ROOM_TYPES_BASE}/${roomTypeAId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
      data: { name: "Hacked Suite" },
    });
    // should return 403 or 404
    expect([403, 404]).toContain(res.status());
  });

  test("org B cannot update org A room operational status", async ({ request }) => {
    const res = await request.patch(`${ROOMS_BASE}/${roomAId}/status`, {
      headers: { Authorization: `Bearer ${userBToken}` },
      data: { operationalStatus: "BLOCKED" },
    });
    expect([403, 404]).toContain(res.status());
  });

  test("org B cannot delete org A room type", async ({ request }) => {
    const res = await request.delete(`${ROOM_TYPES_BASE}/${roomTypeAId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    expect([403, 404]).toContain(res.status());
  });

  test("org B listing rooms for org A hotel returns 404 or empty list", async ({ request }) => {
    const res = await request.get(`${ROOMS_BASE}?hotelId=${hotelAId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    // Hotel doesn't belong to org B — should be 404
    expect(res.status()).toBe(404);
  });
});
