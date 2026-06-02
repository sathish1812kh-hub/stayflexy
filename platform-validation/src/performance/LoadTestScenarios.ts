export interface LoadTestScenario {
  name: string
  description: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  virtualUsers: number
  durationSeconds: number
  rampUpSeconds: number
  expectedP95LatencyMs: number
  expectedThroughputRps: number
  payload?: Record<string, unknown>
}

export const BOOKING_CREATION_SCENARIO: LoadTestScenario = {
  name: 'concurrent_booking_creation',
  description: 'Validates booking throughput and overbooking prevention under load',
  endpoint: '/api/v1/bookings',
  method: 'POST',
  virtualUsers: 50,
  durationSeconds: 60,
  rampUpSeconds: 10,
  expectedP95LatencyMs: 500,
  expectedThroughputRps: 50,
  payload: {
    hotelId: '{{hotelId}}',
    checkInDate: '2025-07-01',
    checkOutDate: '2025-07-03',
    rooms: [
      {
        roomId: '{{roomId}}',
        roomTypeId: '{{roomTypeId}}',
        adultCount: 2,
        childCount: 0,
      },
    ],
    guests: [{ firstName: 'Test', lastName: 'Guest', email: 'test@example.com' }],
    source: 'DIRECT',
    currency: 'USD',
  },
}

export const INVENTORY_READ_SCENARIO: LoadTestScenario = {
  name: 'inventory_availability_read',
  description: 'Validates inventory read throughput with Redis caching',
  endpoint: '/api/v1/inventory/availability',
  method: 'GET',
  virtualUsers: 200,
  durationSeconds: 60,
  rampUpSeconds: 5,
  expectedP95LatencyMs: 50,
  expectedThroughputRps: 500,
}

export const PAYMENT_PROCESSING_SCENARIO: LoadTestScenario = {
  name: 'payment_processing',
  description: 'Validates payment throughput with idempotency',
  endpoint: '/api/v1/payments',
  method: 'POST',
  virtualUsers: 30,
  durationSeconds: 60,
  rampUpSeconds: 10,
  expectedP95LatencyMs: 2000,
  expectedThroughputRps: 20,
}

export const OTA_SYNC_SCENARIO: LoadTestScenario = {
  name: 'ota_inventory_sync',
  description: 'Validates OTA synchronization throughput',
  endpoint: '/api/v1/ota/sync',
  method: 'POST',
  virtualUsers: 10,
  durationSeconds: 300,
  rampUpSeconds: 30,
  expectedP95LatencyMs: 5000,
  expectedThroughputRps: 5,
}

export const NOTIFICATION_THROUGHPUT_SCENARIO: LoadTestScenario = {
  name: 'notification_throughput',
  description: 'Validates notification delivery throughput',
  endpoint: '/api/v1/notifications',
  method: 'POST',
  virtualUsers: 100,
  durationSeconds: 60,
  rampUpSeconds: 10,
  expectedP95LatencyMs: 200,
  expectedThroughputRps: 100,
}

export const ALL_SCENARIOS: LoadTestScenario[] = [
  BOOKING_CREATION_SCENARIO,
  INVENTORY_READ_SCENARIO,
  PAYMENT_PROCESSING_SCENARIO,
  OTA_SYNC_SCENARIO,
  NOTIFICATION_THROUGHPUT_SCENARIO,
]
