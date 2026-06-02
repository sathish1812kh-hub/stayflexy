---
type: community
cohesion: 0.05
members: 78
---

# App Infrastructure & Events

**Cohesion:** 0.05 - loosely connected
**Members:** 78 nodes

## Members
- [[.constructor()_118]] - code - services/inventory-service/src/interfaces/http/InventoryController.ts
- [[.constructor()_110]] - code - services/inventory-service/src/application/use-cases/ReleaseInventory.ts
- [[.constructor()_119]] - code - services/inventory-service/src/workers/HotelEventConsumer.ts
- [[.constructor()_80]] - code - services/booking-service/src/workers/InventoryEventConsumer.ts
- [[.execute()_42]] - code - services/inventory-service/src/application/use-cases/ReleaseInventory.ts
- [[.getAuthContext()_1]] - code - services/inventory-service/src/interfaces/http/InventoryController.ts
- [[.handleEvent()_2]] - code - services/inventory-service/src/workers/HotelEventConsumer.ts
- [[.handleEvent()_1]] - code - services/booking-service/src/workers/InventoryEventConsumer.ts
- [[.start()_5]] - code - services/inventory-service/src/workers/HotelEventConsumer.ts
- [[.start()_4]] - code - services/booking-service/src/workers/InventoryEventConsumer.ts
- [[AuthEventType]] - code - packages/shared-events/src/index.ts
- [[BOOKING_EVENTS]] - code - packages/shared-events/src/index.ts
- [[BookingEventType]] - code - packages/shared-events/src/index.ts
- [[EventEnvelope]] - code - packages/shared-events/src/index.ts
- [[HealthController.ts]] - code - services/auth-service/src/interfaces/http/HealthController.ts
- [[HealthController.ts_1]] - code - services/booking-service/src/interfaces/http/HealthController.ts
- [[HealthController.ts_2]] - code - services/hotel-service/src/interfaces/http/HealthController.ts
- [[HealthController.ts_3]] - code - services/inventory-service/src/interfaces/http/HealthController.ts
- [[HealthController.ts_4]] - code - services/organization-service/src/interfaces/http/HealthController.ts
- [[HealthController.ts_5]] - code - services/payment-service/src/interfaces/http/HealthController.ts
- [[HotelEventConsumer]] - code - services/inventory-service/src/workers/HotelEventConsumer.ts
- [[HotelEventConsumer.ts]] - code - services/inventory-service/src/workers/HotelEventConsumer.ts
- [[HotelEventType]] - code - packages/shared-events/src/index.ts
- [[INVENTORY_EVENTS]] - code - packages/shared-events/src/index.ts
- [[InventoryController]] - code - services/inventory-service/src/interfaces/http/InventoryController.ts
- [[InventoryEventConsumer]] - code - services/booking-service/src/workers/InventoryEventConsumer.ts
- [[InventoryEventConsumer.ts]] - code - services/booking-service/src/workers/InventoryEventConsumer.ts
- [[InventoryEventType]] - code - packages/shared-events/src/index.ts
- [[OrgEventType]] - code - packages/shared-events/src/index.ts
- [[ReleaseInventory]] - code - services/inventory-service/src/application/use-cases/ReleaseInventory.ts
- [[ReleaseInventory.test.ts]] - code - services/inventory-service/src/tests/unit/ReleaseInventory.test.ts
- [[ReleaseInventory.ts]] - code - services/inventory-service/src/application/use-cases/ReleaseInventory.ts
- [[ReleaseResult]] - code - services/inventory-service/src/application/use-cases/ReleaseInventory.ts
- [[app.ts_9]] - code - services/inventory-service/src/interfaces/app.ts
- [[buildSkip()]] - code - packages/shared-database/src/index.ts
- [[config.ts_5]] - code - services/inventory-service/src/config.ts
- [[constructor()]] - code - packages/shared-database/src/index.ts
- [[createApp()_1]] - code - services/payment-service/src/interfaces/app.ts
- [[createEventPublisher()]] - code - packages/shared-events/src/index.ts
- [[createHealthRouter()_1]] - code - services/payment-service/src/interfaces/http/HealthController.ts
- [[createInventoryRouter()]] - code - services/inventory-service/src/interfaces/http/routes.ts
- [[createLogger()_1]] - code - packages/shared-logger/src/index.ts
- [[createPrismaClient()]] - code - packages/shared-database/src/index.ts
- [[createRateLimiter()]] - code - services/organization-service/src/middleware/rateLimit.ts
- [[getPrismaClient()]] - code - packages/shared-database/src/index.ts
- [[index.ts_8]] - code - packages/shared-database/src/index.ts
- [[index.ts_10]] - code - packages/shared-events/src/index.ts
- [[loadNotificationConfig()]] - code - services/notification-service/src/config/index.ts
- [[loadOtaConfig()]] - code - services/ota-service/src/config/index.ts
- [[loadWorkflowConfig()]] - code - services/workflow-service/src/config/index.ts
- [[main()_1]] - code - services/workflow-service/src/main.ts
- [[main.ts_1]] - code - services/auth-service/src/main.ts
- [[main.ts_2]] - code - services/booking-service/src/main.ts
- [[main.ts_3]] - code - services/hotel-service/src/main.ts
- [[main.ts_4]] - code - services/inventory-service/src/main.ts
- [[main.ts_5]] - code - services/notification-service/src/main.ts
- [[main.ts_6]] - code - services/organization-service/src/main.ts
- [[main.ts_7]] - code - services/ota-service/src/main.ts
- [[main.ts_8]] - code - services/payment-service/src/main.ts
- [[main.ts_11]] - code - services/workflow-service/src/main.ts
- [[makeReservationRepo()]] - code - services/inventory-service/src/tests/unit/ReleaseInventory.test.ts
- [[mockLogger_22]] - code - services/inventory-service/src/tests/unit/ReleaseInventory.test.ts
- [[mockPublisher_12]] - code - services/inventory-service/src/tests/unit/ReleaseInventory.test.ts
- [[rateLimit.ts_1]] - code - services/auth-service/src/middleware/rateLimit.ts
- [[rateLimit.ts_2]] - code - services/hotel-service/src/middleware/rateLimit.ts
- [[rateLimit.ts_3]] - code - services/inventory-service/src/middleware/rateLimit.ts
- [[rateLimit.ts_4]] - code - services/organization-service/src/middleware/rateLimit.ts
- [[routes.ts_4]] - code - services/inventory-service/src/interfaces/http/routes.ts
- [[tracing.ts_2]] - code - services/auth-service/src/tracing.ts
- [[tracing.ts_3]] - code - services/booking-service/src/tracing.ts
- [[tracing.ts_4]] - code - services/hotel-service/src/tracing.ts
- [[tracing.ts_5]] - code - services/inventory-service/src/tracing.ts
- [[tracing.ts_6]] - code - services/notification-service/src/tracing.ts
- [[tracing.ts_7]] - code - services/organization-service/src/tracing.ts
- [[tracing.ts_8]] - code - services/ota-service/src/tracing.ts
- [[tracing.ts_9]] - code - services/payment-service/src/tracing.ts
- [[tracing.ts_12]] - code - services/workflow-service/src/tracing.ts
- [[withTransaction()]] - code - packages/shared-database/src/index.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/App_Infrastructure__Events
SORT file.name ASC
```

## Connections to other communities
- 27 edges to [[_COMMUNITY_Inventory & Lock]]
- 23 edges to [[_COMMUNITY_Organization Domain]]
- 22 edges to [[_COMMUNITY_Community 80]]
- 18 edges to [[_COMMUNITY_Community 3]]
- 15 edges to [[_COMMUNITY_Community 22]]
- 11 edges to [[_COMMUNITY_Community 61]]
- 10 edges to [[_COMMUNITY_Community 52]]
- 10 edges to [[_COMMUNITY_Community 72]]
- 9 edges to [[_COMMUNITY_Community 54]]
- 9 edges to [[_COMMUNITY_Community 134]]
- 9 edges to [[_COMMUNITY_Community 116]]
- 9 edges to [[_COMMUNITY_Community 121]]
- 8 edges to [[_COMMUNITY_Community 29]]
- 6 edges to [[_COMMUNITY_Community 77]]
- 6 edges to [[_COMMUNITY_Community 16]]
- 5 edges to [[_COMMUNITY_Community 122]]
- 5 edges to [[_COMMUNITY_Community 82]]
- 5 edges to [[_COMMUNITY_Community 173]]
- 5 edges to [[_COMMUNITY_Community 178]]
- 5 edges to [[_COMMUNITY_Community 130]]
- 5 edges to [[_COMMUNITY_Community 131]]
- 4 edges to [[_COMMUNITY_Community 28]]
- 4 edges to [[_COMMUNITY_Community 81]]
- 4 edges to [[_COMMUNITY_Community 136]]
- 4 edges to [[_COMMUNITY_Community 95]]
- 4 edges to [[_COMMUNITY_Community 20]]
- 4 edges to [[_COMMUNITY_Community 137]]
- 4 edges to [[_COMMUNITY_Community 86]]
- 4 edges to [[_COMMUNITY_Community 96]]
- 4 edges to [[_COMMUNITY_Community 187]]
- 3 edges to [[_COMMUNITY_Community 108]]
- 3 edges to [[_COMMUNITY_Community 112]]
- 3 edges to [[_COMMUNITY_Community 176]]
- 3 edges to [[_COMMUNITY_Community 60]]
- 3 edges to [[_COMMUNITY_Community 50]]
- 3 edges to [[_COMMUNITY_Community 286]]
- 3 edges to [[_COMMUNITY_Community 202]]
- 3 edges to [[_COMMUNITY_Community 59]]
- 2 edges to [[_COMMUNITY_Community 19]]
- 2 edges to [[_COMMUNITY_Community 161]]
- 2 edges to [[_COMMUNITY_Community 74]]
- 2 edges to [[_COMMUNITY_Community 51]]
- 2 edges to [[_COMMUNITY_Community 334]]
- 2 edges to [[_COMMUNITY_Community 215]]
- 2 edges to [[_COMMUNITY_Community 87]]
- 2 edges to [[_COMMUNITY_Community 144]]
- 2 edges to [[_COMMUNITY_Community 97]]
- 2 edges to [[_COMMUNITY_Community 225]]
- 2 edges to [[_COMMUNITY_Community 201]]
- 2 edges to [[_COMMUNITY_Community 354]]
- 2 edges to [[_COMMUNITY_Community 124]]
- 1 edge to [[_COMMUNITY_Community 358]]
- 1 edge to [[_COMMUNITY_Community 248]]
- 1 edge to [[_COMMUNITY_Community 21]]
- 1 edge to [[_COMMUNITY_Community 135]]
- 1 edge to [[_COMMUNITY_Community 160]]
- 1 edge to [[_COMMUNITY_Community 188]]
- 1 edge to [[_COMMUNITY_Community 219]]
- 1 edge to [[_COMMUNITY_Community 394]]
- 1 edge to [[_COMMUNITY_Community 395]]
- 1 edge to [[_COMMUNITY_Community 396]]
- 1 edge to [[_COMMUNITY_Community 140]]
- 1 edge to [[_COMMUNITY_Community 133]]
- 1 edge to [[_COMMUNITY_Community 365]]
- 1 edge to [[_COMMUNITY_Community 316]]
- 1 edge to [[_COMMUNITY_Community 115]]
- 1 edge to [[_COMMUNITY_Community 381]]
- 1 edge to [[_COMMUNITY_Community 119]]
- 1 edge to [[_COMMUNITY_Community 317]]
- 1 edge to [[_COMMUNITY_Community 278]]
- 1 edge to [[_COMMUNITY_OTA Adapters]]
- 1 edge to [[_COMMUNITY_Community 388]]
- 1 edge to [[_COMMUNITY_Community 199]]
- 1 edge to [[_COMMUNITY_Community 338]]
- 1 edge to [[_COMMUNITY_Community 337]]
- 1 edge to [[_COMMUNITY_Community 379]]
- 1 edge to [[_COMMUNITY_Community 378]]
- 1 edge to [[_COMMUNITY_Community 387]]

## Top bridge nodes
- [[index.ts_10]] - degree 97, connects to 32 communities
- [[getPrismaClient()]] - degree 50, connects to 30 communities
- [[index.ts_8]] - degree 47, connects to 28 communities
- [[main.ts_11]] - degree 30, connects to 15 communities
- [[main.ts_7]] - degree 28, connects to 14 communities