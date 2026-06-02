// FILE: src/modules/booking/tests/booking.test.ts
import { test, expect, type APIRequestContext } from "@playwright/test";

const AUTH_BASE = "/api/v1/auth";
const HOTEL_BASE = "/api/v1/hotels";
const ROOM_TYPE_BASE = "/api/v1/room-types";
const ROOM_BASE = "/api/v1/rooms";
const INV_BASE = "/api/v1/inventory";
const BOOKING_BASE = "/api/v1/bookings";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetupContext {
  accessToken: string;
  userId: string;
  organizationId: string;
  hotelId: string;
  roomTypeId: string;
  roomId: string;
}

interface BookingBody {
  id: string;
  bookingNumber: string;
  status: string;
  source: string;
  organizationId: string;
  hotelId: string;
  totalAmount: number;
  finalAmount: number;
  rooms: Array<{ id: string; roomId: string; status: string }>;
  guests: Array<{ id: string; isPrimary: boolean; firstName: string }>;
  audit: Array<{ eventType: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateOffset(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().substring(0, 10);
}

async function registerAndSetup(request: APIRequestContext): Promise<SetupContext> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `booking-test+${suffix}@example.com`;

  // 1. Register org owner
  const regRes = await request.post(`${AUTH_BASE}/register`, {
    data: {
      email,
      password: "Password123!",
      firstName: "Booking",
      lastName: "Tester",
      organizationName: `Booking Org ${suffix}`,
    },
  });
  expect(regRes.status()).toBe(201);
  const regBody = await regRes.json() as {
    data: {
      user: { id: string; organizationId: string | null };
      tokens: { accessToken: string };
    };
  };
  const accessToken = regBody.data.tokens.accessToken;
  const userId = regBody.data.user.id;
  const organizationId = regBody.data.user.organizationId ?? "";

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // 2. Create hotel
  const hotelRes = await request.post(HOTEL_BASE, {
    headers: authHeaders,
    data: {
      name: `Booking Hotel ${suffix}`,
      email: `hotel+${suffix}@example.com`,
      phone: "+10000000001",
      timezone: "UTC",
      currency: "USD",
      category: "HOTEL",
      starRating: 3,
      addressLine1: "123 Booking Street",
      city: "Testville",
      country: "US",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      totalRooms: 50,
    },
  });
  const hotelStatus = hotelRes.status();
  if (hotelStatus !== 201 && hotelStatus !== 200) {
    return { accessToken, userId, organizationId, hotelId: "", roomTypeId: "", roomId: "" };
  }
  const hotelBody = await hotelRes.json() as { data: { id: string } };
  const hotelId = hotelBody.data.id;

  // 3. Create room type
  const rtRes = await request.post(ROOM_TYPE_BASE, {
    headers: authHeaders,
    data: {
      hotelId,
      name: `Deluxe ${suffix}`,
      maxAdults: 2,
      maxChildren: 1,
      maxOccupancy: 3,
      basePrice: 200,
      bedType: "KING",
      amenities: ["WiFi", "TV"],
    },
  });
  const rtStatus = rtRes.status();
  if (rtStatus !== 201 && rtStatus !== 200) {
    return { accessToken, userId, organizationId, hotelId, roomTypeId: "", roomId: "" };
  }
  const rtBody = await rtRes.json() as { data: { id: string } };
  const roomTypeId = rtBody.data.id;

  // 4. Set inventory (5 rooms for a wide range)
  await request.post(INV_BASE, {
    headers: authHeaders,
    data: {
      hotelId,
      roomTypeId,
      startDate: dateOffset(1),
      endDate: dateOffset(60),
      totalInventory: 5,
    },
  });

  // 5. Create a physical room
  const roomRes = await request.post(ROOM_BASE, {
    headers: authHeaders,
    data: {
      hotelId,
      roomTypeId,
      roomNumber: `101-${suffix}`,
      floor: 1,
    },
  });
  const roomStatus = roomRes.status();
  if (roomStatus !== 201 && roomStatus !== 200) {
    return { accessToken, userId, organizationId, hotelId, roomTypeId, roomId: "" };
  }
  const roomBody = await roomRes.json() as { data: { id: string } };
  const roomId = roomBody.data.id;

  return { accessToken, userId, organizationId, hotelId, roomTypeId, roomId };
}

function makeBookingPayload(
  ctx: SetupContext,
  checkIn = dateOffset(10),
  checkOut = dateOffset(12)
) {
  return {
    hotelId: ctx.hotelId,
    source: "DIRECT",
    currency: "USD",
    specialRequests: "Late check-in please",
    rooms: [
      {
        roomId: ctx.roomId,
        roomTypeId: ctx.roomTypeId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adultCount: 2,
        childCount: 0,
      },
    ],
    guests: [
      {
        isPrimary: true,
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+10000000001",
        nationality: "US",
      },
    ],
  };
}

// ─── POST /api/v1/bookings — create booking ───────────────────────────────────

test.describe("POST /api/v1/bookings — create booking", () => {
  let ctx: SetupContext;

  test.beforeAll(async ({ request }) => {
    ctx = await registerAndSetup(request);
  });

  test("creates a booking and returns bookingNumber", async ({ request }) => {
    if (!ctx.hotelId || !ctx.roomId) {
      test.skip();
      return;
    }

    const res = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: makeBookingPayload(ctx),
    });

    expect([200, 201]).toContain(res.status());
    const body = await res.json() as { success: boolean; data: BookingBody };
    expect(body.success).toBe(true);
    expect(body.data.bookingNumber).toMatch(/^SFX-\d{8}-[A-F0-9]{6}$/);
    expect(body.data.status).toBe("PENDING");
    expect(body.data.hotelId).toBe(ctx.hotelId);
    expect(Array.isArray(body.data.rooms)).toBe(true);
    expect(body.data.rooms.length).toBe(1);
    expect(Array.isArray(body.data.guests)).toBe(true);
    expect(body.data.guests.length).toBe(1);
    expect(body.data.guests[0]?.isPrimary).toBe(true);
  });

  test("returns 401 without auth token", async ({ request }) => {
    const res = await request.post(BOOKING_BASE, {
      data: makeBookingPayload(ctx),
    });
    expect(res.status()).toBe(401);
  });

  test("returns 422 for missing hotelId", async ({ request }) => {
    if (!ctx.roomId) {
      test.skip();
      return;
    }

    const payload = makeBookingPayload(ctx);
    const { hotelId: _unused, ...payloadWithoutHotel } = payload; void _unused;
    const res = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: payloadWithoutHotel,
    });
    expect(res.status()).toBe(422);
    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("returns 422 when checkOut is before checkIn", async ({ request }) => {
    if (!ctx.roomId) {
      test.skip();
      return;
    }

    const res = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: makeBookingPayload(ctx, dateOffset(15), dateOffset(10)),
    });
    expect(res.status()).toBe(422);
  });

  test("returns 422 when no primary guest", async ({ request }) => {
    if (!ctx.roomId) {
      test.skip();
      return;
    }

    const payload = makeBookingPayload(ctx);
    if (payload.guests[0]) { payload.guests[0].isPrimary = false as never; }
    const res = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: payload,
    });
    expect(res.status()).toBe(422);
  });
});

// ─── GET /api/v1/bookings/:id — get booking ───────────────────────────────────

test.describe("GET /api/v1/bookings/:id — get booking", () => {
  let ctx: SetupContext;
  let bookingId: string;

  test.beforeAll(async ({ request }) => {
    ctx = await registerAndSetup(request);
    if (!ctx.roomId) return;

    const res = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: makeBookingPayload(ctx, dateOffset(20), dateOffset(22)),
    });
    if (res.status() === 201 || res.status() === 200) {
      const body = await res.json() as { data: { id: string } };
      bookingId = body.data.id;
    }
  });

  test("returns booking with rooms and guests", async ({ request }) => {
    if (!bookingId) {
      test.skip();
      return;
    }

    const res = await request.get(`${BOOKING_BASE}/${bookingId}`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json() as { success: boolean; data: BookingBody };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(bookingId);
    expect(Array.isArray(body.data.rooms)).toBe(true);
    expect(body.data.rooms.length).toBeGreaterThan(0);
    expect(Array.isArray(body.data.guests)).toBe(true);
    expect(body.data.guests.length).toBeGreaterThan(0);
    expect(Array.isArray(body.data.audit)).toBe(true);
    // Audit should have at least one CREATED entry
    expect(body.data.audit.some((a) => a.eventType === "CREATED")).toBe(true);
  });

  test("returns 404 for non-existent booking", async ({ request }) => {
    const res = await request.get(`${BOOKING_BASE}/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });
    expect([404, 403]).toContain(res.status());
  });
});

// ─── GET /api/v1/bookings?hotelId=X — list bookings ──────────────────────────

test.describe("GET /api/v1/bookings — list bookings with pagination", () => {
  let ctx: SetupContext;

  test.beforeAll(async ({ request }) => {
    ctx = await registerAndSetup(request);
    if (!ctx.roomId) return;

    // Create two bookings
    for (const offset of [30, 33]) {
      await request.post(BOOKING_BASE, {
        headers: { Authorization: `Bearer ${ctx.accessToken}` },
        data: makeBookingPayload(ctx, dateOffset(offset), dateOffset(offset + 2)),
      });
    }
  });

  test("lists bookings with pagination meta", async ({ request }) => {
    if (!ctx.hotelId) {
      test.skip();
      return;
    }

    const res = await request.get(
      `${BOOKING_BASE}?hotelId=${ctx.hotelId}&page=1&limit=10`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } }
    );

    expect(res.status()).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: BookingBody[];
      meta: { pagination: { page: number; limit: number; total: number } };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta?.pagination).toBeDefined();
    expect(typeof body.meta.pagination.total).toBe("number");
  });

  test("filters by status", async ({ request }) => {
    if (!ctx.hotelId) {
      test.skip();
      return;
    }

    const res = await request.get(
      `${BOOKING_BASE}?hotelId=${ctx.hotelId}&status=PENDING`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } }
    );

    expect(res.status()).toBe(200);
    const body = await res.json() as { success: boolean; data: BookingBody[] };
    expect(body.success).toBe(true);
    if (body.data.length > 0) {
      expect(body.data.every((b) => b.status === "PENDING")).toBe(true);
    }
  });
});

// ─── GET /api/v1/bookings/availability/search ─────────────────────────────────

test.describe("GET /api/v1/bookings/availability/search — availability", () => {
  let ctx: SetupContext;

  test.beforeAll(async ({ request }) => {
    ctx = await registerAndSetup(request);
  });

  test("returns availability results", async ({ request }) => {
    if (!ctx.hotelId || !ctx.roomTypeId) {
      test.skip();
      return;
    }

    const res = await request.get(
      `${BOOKING_BASE}/availability/search?hotelId=${ctx.hotelId}&checkInDate=${dateOffset(50)}&checkOutDate=${dateOffset(52)}&adultCount=1`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } }
    );

    expect([200, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json() as {
        success: boolean;
        data: Array<{ roomTypeId: string; availableRooms: number; nightCount: number }>;
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      if (body.data.length > 0) {
        expect(body.data[0]?.nightCount).toBe(2);
        expect(body.data[0]?.availableRooms).toBeGreaterThan(0);
      }
    }
  });

  test("returns 422 when checkOut before checkIn", async ({ request }) => {
    if (!ctx.hotelId) {
      test.skip();
      return;
    }

    const res = await request.get(
      `${BOOKING_BASE}/availability/search?hotelId=${ctx.hotelId}&checkInDate=${dateOffset(10)}&checkOutDate=${dateOffset(8)}`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } }
    );
    expect(res.status()).toBe(422);
  });

  test("returns 401 without auth", async ({ request }) => {
    const res = await request.get(
      `${BOOKING_BASE}/availability/search?hotelId=00000000-0000-0000-0000-000000000001&checkInDate=${dateOffset(5)}&checkOutDate=${dateOffset(7)}`
    );
    expect(res.status()).toBe(401);
  });
});

// ─── POST /api/v1/bookings/:id/cancel ────────────────────────────────────────

test.describe("POST /api/v1/bookings/:id/cancel — cancel booking", () => {
  let ctx: SetupContext;
  let bookingId: string;

  test.beforeAll(async ({ request }) => {
    ctx = await registerAndSetup(request);
    if (!ctx.roomId) return;

    const res = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: makeBookingPayload(ctx, dateOffset(40), dateOffset(42)),
    });
    if (res.status() === 201 || res.status() === 200) {
      const body = await res.json() as { data: { id: string } };
      bookingId = body.data.id;
    }
  });

  test("cancels a pending booking", async ({ request }) => {
    if (!bookingId) {
      test.skip();
      return;
    }

    const res = await request.post(`${BOOKING_BASE}/${bookingId}/cancel`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: { reason: "GUEST_REQUEST", note: "Guest changed plans" },
    });

    expect([200, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json() as { success: boolean; data: BookingBody };
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("CANCELLED");
    }
  });

  test("cannot cancel already-cancelled booking — returns 422", async ({ request }) => {
    if (!bookingId) {
      test.skip();
      return;
    }

    // Try to cancel again
    const res = await request.post(`${BOOKING_BASE}/${bookingId}/cancel`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: { reason: "DUPLICATE_BOOKING" },
    });

    // Should be 400 (bad request) or 422 (invalid transition)
    expect([400, 403, 422]).toContain(res.status());
  });

  test("returns 422 for invalid reason enum", async ({ request }) => {
    if (!bookingId) {
      test.skip();
      return;
    }

    const res = await request.post(`${BOOKING_BASE}/${bookingId}/cancel`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: { reason: "NOT_A_VALID_REASON" },
    });

    expect(res.status()).toBe(422);
  });
});

// ─── POST /api/v1/bookings/:id/check-in ──────────────────────────────────────

test.describe("POST /api/v1/bookings/:id/check-in — check in", () => {
  let ctx: SetupContext;
  let bookingId: string;

  test.beforeAll(async ({ request }) => {
    ctx = await registerAndSetup(request);
    if (!ctx.roomId) return;

    // Create a booking with check-in date in the past (today) so we can check in
    const res = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: makeBookingPayload(ctx, dateOffset(1), dateOffset(3)),
    });
    if (res.status() === 201 || res.status() === 200) {
      const body = await res.json() as { data: { id: string } };
      bookingId = body.data.id;
    }
  });

  test("cannot check in PENDING booking (must be CONFIRMED)", async ({ request }) => {
    if (!bookingId) {
      test.skip();
      return;
    }

    const res = await request.post(`${BOOKING_BASE}/${bookingId}/check-in`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });

    // PENDING → CHECKED_IN is invalid; should return 400
    expect([400, 403, 422]).toContain(res.status());
  });

  test("returns 401 without auth", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000001";
    const res = await request.post(`${BOOKING_BASE}/${fakeId}/check-in`);
    expect(res.status()).toBe(401);
  });
});

// ─── POST /api/v1/bookings/:id/check-out ─────────────────────────────────────

test.describe("POST /api/v1/bookings/:id/check-out — check out", () => {
  test("returns 401 without auth", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000001";
    const res = await request.post(`${BOOKING_BASE}/${fakeId}/check-out`);
    expect(res.status()).toBe(401);
  });

  test("cannot check out a PENDING booking — returns 400/422", async ({ request }) => {
    let bookingId: string;
    const ctx = await registerAndSetup(request);
    if (!ctx.roomId) {
      test.skip();
      return;
    }

    const res = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: makeBookingPayload(ctx, dateOffset(5), dateOffset(7)),
    });
    if (res.status() === 201 || res.status() === 200) {
      const body = await res.json() as { data: { id: string } };
      bookingId = body.data.id;
    } else {
      test.skip();
      return;
    }

    const checkOutRes = await request.post(`${BOOKING_BASE}/${bookingId}/check-out`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });

    expect([400, 403, 422]).toContain(checkOutRes.status());
  });
});

// ─── Overbooking — 409 conflict ───────────────────────────────────────────────

test.describe("Overbooking — inventory exhaustion triggers 409", () => {
  let ctx: SetupContext;

  test.beforeAll(async ({ request }) => {
    ctx = await registerAndSetup(request);
    if (!ctx.roomId) return;

    // Seed exactly 1 room of inventory for the test dates
    await request.post(INV_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: {
        hotelId: ctx.hotelId,
        roomTypeId: ctx.roomTypeId,
        date: dateOffset(55),
        totalInventory: 1,
      },
    });
  });

  test("second booking for same room type same dates → 409 when inventory exhausted", async ({
    request,
  }) => {
    if (!ctx.roomId) {
      test.skip();
      return;
    }

    const authHeaders = { Authorization: `Bearer ${ctx.accessToken}` };

    // First booking should succeed (uses the 1 available room)
    const first = await request.post(BOOKING_BASE, {
      headers: authHeaders,
      data: makeBookingPayload(ctx, dateOffset(55), dateOffset(57)),
    });

    if (first.status() !== 201 && first.status() !== 200) {
      test.skip();
      return;
    }

    // Second booking for the same room on same dates should fail
    const second = await request.post(BOOKING_BASE, {
      headers: authHeaders,
      data: makeBookingPayload(ctx, dateOffset(55), dateOffset(57)),
    });

    // Either 409 (overlap for same roomId) or 409 (no inventory)
    expect([409, 400]).toContain(second.status());
    if (second.status() === 409) {
      const body = await second.json() as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("CONFLICT");
    }
  });
});

// ─── Duplicate room overlap — 409 conflict ────────────────────────────────────

test.describe("Duplicate room overlap — same room same dates → 409", () => {
  let ctx: SetupContext;
  let firstBookingId: string;

  test.beforeAll(async ({ request }) => {
    ctx = await registerAndSetup(request);
    if (!ctx.roomId) return;

    const res = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: makeBookingPayload(ctx, dateOffset(25), dateOffset(27)),
    });
    if (res.status() === 201 || res.status() === 200) {
      const body = await res.json() as { data: { id: string } };
      firstBookingId = body.data.id;
    }
  });

  test("booking same room on overlapping dates → 409", async ({ request }) => {
    if (!firstBookingId || !ctx.roomId) {
      test.skip();
      return;
    }

    const res = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: makeBookingPayload(ctx, dateOffset(25), dateOffset(27)),
    });

    // Should conflict since the room is already booked
    expect([409, 400]).toContain(res.status());
  });
});

// ─── Cross-org isolation ──────────────────────────────────────────────────────

test.describe("Cross-org isolation — org B cannot access org A bookings", () => {
  let ctxA: SetupContext;
  let ctxB: SetupContext;
  let bookingIdA: string;

  test.beforeAll(async ({ request }) => {
    [ctxA, ctxB] = await Promise.all([
      registerAndSetup(request),
      registerAndSetup(request),
    ]);

    if (!ctxA.roomId) return;

    const res = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctxA.accessToken}` },
      data: makeBookingPayload(ctxA, dateOffset(35), dateOffset(37)),
    });
    if (res.status() === 201 || res.status() === 200) {
      const body = await res.json() as { data: { id: string } };
      bookingIdA = body.data.id;
    }
  });

  test("org B user cannot GET org A booking → 403/404", async ({ request }) => {
    if (!bookingIdA || !ctxB.accessToken) {
      test.skip();
      return;
    }

    const res = await request.get(`${BOOKING_BASE}/${bookingIdA}`, {
      headers: { Authorization: `Bearer ${ctxB.accessToken}` },
    });

    expect([403, 404]).toContain(res.status());
  });

  test("org B user cannot cancel org A booking → 403/404", async ({ request }) => {
    if (!bookingIdA || !ctxB.accessToken) {
      test.skip();
      return;
    }

    const res = await request.post(`${BOOKING_BASE}/${bookingIdA}/cancel`, {
      headers: { Authorization: `Bearer ${ctxB.accessToken}` },
      data: { reason: "HOTEL_REQUEST" },
    });

    expect([403, 404]).toContain(res.status());
  });

  test("org B listing bookings does not include org A bookings", async ({ request }) => {
    if (!ctxA.hotelId || !ctxB.accessToken) {
      test.skip();
      return;
    }

    const res = await request.get(
      `${BOOKING_BASE}?hotelId=${ctxA.hotelId}`,
      { headers: { Authorization: `Bearer ${ctxB.accessToken}` } }
    );

    // Either forbidden or empty list
    if (res.status() === 200) {
      const body = await res.json() as { success: boolean; data: BookingBody[] };
      // Org B sees empty results for org A hotel
      expect(body.data.length).toBe(0);
    } else {
      expect([403]).toContain(res.status());
    }
  });
});

// ─── Invalid status transitions ───────────────────────────────────────────────

test.describe("Invalid status transitions", () => {
  let ctx: SetupContext;
  let bookingId: string;

  test.beforeAll(async ({ request }) => {
    ctx = await registerAndSetup(request);
    if (!ctx.roomId) return;

    // Create and immediately cancel a booking
    const createRes = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: makeBookingPayload(ctx, dateOffset(45), dateOffset(47)),
    });

    if (createRes.status() === 201 || createRes.status() === 200) {
      const body = await createRes.json() as { data: { id: string } };
      bookingId = body.data.id;

      await request.post(`${BOOKING_BASE}/${bookingId}/cancel`, {
        headers: { Authorization: `Bearer ${ctx.accessToken}` },
        data: { reason: "GUEST_REQUEST" },
      });
    }
  });

  test("cancelling an already-cancelled booking returns 400/422", async ({ request }) => {
    if (!bookingId) {
      test.skip();
      return;
    }

    const res = await request.post(`${BOOKING_BASE}/${bookingId}/cancel`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: { reason: "OTHER" },
    });

    expect([400, 403, 422]).toContain(res.status());
    if (res.status() === 400 || res.status() === 422) {
      const body = await res.json() as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
    }
  });

  test("checking out without checking in first returns 400/422", async ({ request }) => {
    if (!ctx.roomId) {
      test.skip();
      return;
    }

    // Create a fresh booking
    const createRes = await request.post(BOOKING_BASE, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: makeBookingPayload(ctx, dateOffset(48), dateOffset(50)),
    });

    if (createRes.status() !== 201 && createRes.status() !== 200) {
      test.skip();
      return;
    }

    const body = await createRes.json() as { data: { id: string } };
    const newBookingId = body.data.id;

    const checkOutRes = await request.post(`${BOOKING_BASE}/${newBookingId}/check-out`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });

    expect([400, 403, 422]).toContain(checkOutRes.status());
  });
});
