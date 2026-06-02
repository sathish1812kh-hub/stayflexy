---
type: community
cohesion: 0.05
members: 85
---

# Controllers & Validation

**Cohesion:** 0.05 - loosely connected
**Members:** 85 nodes

## Members
- [[.cancel()]] - code - src/modules/booking/controllers/index.ts
- [[.changePassword()]] - code - src/modules/auth/controllers/index.ts
- [[.checkIn()_1]] - code - src/modules/booking/controllers/index.ts
- [[.checkOut()_1]] - code - src/modules/booking/controllers/index.ts
- [[.constructor()_266]] - code - src/modules/auth/controllers/index.ts
- [[.constructor()_271]] - code - src/modules/booking/controllers/index.ts
- [[.constructor()_288]] - code - src/modules/notification/controllers/index.ts
- [[.constructor()_298]] - code - src/modules/payment/controllers/index.ts
- [[.create()_31]] - code - src/modules/booking/controllers/index.ts
- [[.create()_49]] - code - src/modules/notification/controllers/index.ts
- [[.create()_59]] - code - src/modules/payment/controllers/index.ts
- [[.createTemplate()]] - code - src/modules/notification/controllers/index.ts
- [[.getById()]] - code - src/modules/booking/controllers/index.ts
- [[.getById()_3]] - code - src/modules/notification/controllers/index.ts
- [[.getById()_5]] - code - src/modules/payment/controllers/index.ts
- [[.getTemplate()]] - code - src/modules/notification/controllers/index.ts
- [[.list()_1]] - code - src/modules/booking/controllers/index.ts
- [[.list()_4]] - code - src/modules/notification/controllers/index.ts
- [[.listByHotel()_1]] - code - src/modules/payment/controllers/index.ts
- [[.listTemplates()]] - code - src/modules/notification/controllers/index.ts
- [[.login()]] - code - src/modules/auth/controllers/index.ts
- [[.logout()]] - code - src/modules/auth/controllers/index.ts
- [[.markNoShow()]] - code - src/modules/booking/controllers/index.ts
- [[.process()_1]] - code - src/modules/notification/controllers/index.ts
- [[.refreshTokens()]] - code - src/modules/auth/controllers/index.ts
- [[.refund()]] - code - src/modules/payment/controllers/index.ts
- [[.register()_3]] - code - src/modules/auth/controllers/index.ts
- [[.requestPasswordReset()]] - code - src/modules/auth/controllers/index.ts
- [[.resetPassword()]] - code - src/modules/auth/controllers/index.ts
- [[.retryFailed()]] - code - src/modules/notification/controllers/index.ts
- [[.searchAvailability()]] - code - src/modules/booking/controllers/index.ts
- [[.sendFromTemplate()]] - code - src/modules/notification/controllers/index.ts
- [[.update()_18]] - code - src/modules/booking/controllers/index.ts
- [[.updateTemplate()]] - code - src/modules/notification/controllers/index.ts
- [[AuthController_1]] - code - src/modules/auth/controllers/index.ts
- [[BookingController_1]] - code - src/modules/booking/controllers/index.ts
- [[GET_9]] - code - src/app/api/v1/auth/me/route.ts
- [[NotificationController_1]] - code - src/modules/notification/controllers/index.ts
- [[POST()]] - code - src/app/api/v1/auth/login/route.ts
- [[POST()_1]] - code - src/app/api/v1/auth/refresh/route.ts
- [[POST()_2]] - code - src/app/api/v1/auth/register/route.ts
- [[PaymentController_1]] - code - src/modules/payment/controllers/index.ts
- [[authService]] - code - src/modules/auth/container.ts
- [[createAuthRoutes()]] - code - src/modules/auth/routes/index.ts
- [[createBookingRoutes()]] - code - src/modules/booking/routes/index.ts
- [[createPaymentRoutes()]] - code - src/modules/payment/routes/index.ts
- [[createdResponse()]] - code - src/common/utils/apiResponse.ts
- [[handleRouteError()]] - code - src/common/middleware/errorHandler.ts
- [[index.ts_106]] - code - src/modules/auth/controllers/index.ts
- [[index.ts_110]] - code - src/modules/auth/routes/index.ts
- [[index.ts_111]] - code - src/modules/auth/services/index.ts
- [[index.ts_132]] - code - src/modules/booking/controllers/index.ts
- [[index.ts_136]] - code - src/modules/booking/routes/index.ts
- [[index.ts_137]] - code - src/modules/booking/services/index.ts
- [[index.ts_144]] - code - src/modules/channel-manager/middleware/index.ts
- [[index.ts_232]] - code - src/modules/notification/controllers/index.ts
- [[index.ts_268]] - code - src/modules/payment/controllers/index.ts
- [[index.ts_271]] - code - src/modules/payment/routes/index.ts
- [[index.ts_272]] - code - src/modules/payment/services/index.ts
- [[route.ts_9]] - code - src/app/api/v1/auth/login/route.ts
- [[route.ts_11]] - code - src/app/api/v1/auth/me/route.ts
- [[route.ts_12]] - code - src/app/api/v1/auth/refresh/route.ts
- [[route.ts_13]] - code - src/app/api/v1/auth/register/route.ts
- [[validateAvailabilitySearch()]] - code - src/modules/booking/validators/index.ts
- [[validateBookingFilter()]] - code - src/modules/booking/validators/index.ts
- [[validateCancelBooking()]] - code - src/modules/booking/validators/index.ts
- [[validateChangePassword()]] - code - src/modules/auth/validators/index.ts
- [[validateCreateBooking()]] - code - src/modules/booking/validators/index.ts
- [[validateCreateNotification()]] - code - src/modules/notification/validators/index.ts
- [[validateCreatePayment()]] - code - src/modules/payment/validators/index.ts
- [[validateCreateTemplate()]] - code - src/modules/notification/validators/index.ts
- [[validateHotelScope()]] - code - src/modules/channel-manager/middleware/index.ts
- [[validateInitiateRefund()]] - code - src/modules/payment/validators/index.ts
- [[validateLogin()]] - code - src/modules/auth/validators/index.ts
- [[validateMappingOwnership()]] - code - src/modules/channel-manager/middleware/index.ts
- [[validateNotificationFilter()]] - code - src/modules/notification/validators/index.ts
- [[validatePaymentFilter()]] - code - src/modules/payment/validators/index.ts
- [[validateRefreshToken()]] - code - src/modules/auth/validators/index.ts
- [[validateRegisterOrgOwner()]] - code - src/modules/auth/validators/index.ts
- [[validateRequestPasswordReset()]] - code - src/modules/auth/validators/index.ts
- [[validateResetPassword()]] - code - src/modules/auth/validators/index.ts
- [[validateSendNotification()]] - code - src/modules/notification/validators/index.ts
- [[validateTemplateFilter()]] - code - src/modules/notification/validators/index.ts
- [[validateUpdateBooking()]] - code - src/modules/booking/validators/index.ts
- [[validateUpdateTemplate()]] - code - src/modules/notification/validators/index.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Controllers__Validation
SORT file.name ASC
```

## Connections to other communities
- 110 edges to [[_COMMUNITY_API Routes]]
- 17 edges to [[_COMMUNITY_Community 14]]
- 16 edges to [[_COMMUNITY_Community 58]]
- 15 edges to [[_COMMUNITY_Community 27]]
- 14 edges to [[_COMMUNITY_Community 64]]
- 12 edges to [[_COMMUNITY_Community 17]]
- 12 edges to [[_COMMUNITY_Community 167]]
- 10 edges to [[_COMMUNITY_Community 171]]
- 9 edges to [[_COMMUNITY_Community 62]]
- 7 edges to [[_COMMUNITY_Community 213]]
- 5 edges to [[_COMMUNITY_Community 362]]
- 4 edges to [[_COMMUNITY_Community 37]]
- 4 edges to [[_COMMUNITY_Community 33]]
- 4 edges to [[_COMMUNITY_Community 326]]
- 4 edges to [[_COMMUNITY_Payment Domain]]
- 3 edges to [[_COMMUNITY_Community 311]]
- 2 edges to [[_COMMUNITY_Community 339]]
- 2 edges to [[_COMMUNITY_Booking Domain]]
- 1 edge to [[_COMMUNITY_Automation Engine]]
- 1 edge to [[_COMMUNITY_Community 88]]
- 1 edge to [[_COMMUNITY_Community 150]]
- 1 edge to [[_COMMUNITY_Community 247]]
- 1 edge to [[_COMMUNITY_Community 312]]
- 1 edge to [[_COMMUNITY_Community 197]]
- 1 edge to [[_COMMUNITY_Community 276]]

## Top bridge nodes
- [[handleRouteError()]] - degree 187, connects to 10 communities
- [[index.ts_232]] - degree 21, connects to 8 communities
- [[createdResponse()]] - degree 27, connects to 6 communities
- [[index.ts_106]] - degree 16, connects to 4 communities
- [[index.ts_132]] - degree 17, connects to 3 communities