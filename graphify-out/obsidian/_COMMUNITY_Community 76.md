---
type: community
cohesion: 0.16
members: 31
---

# Community 76

**Cohesion:** 0.16 - loosely connected
**Members:** 31 nodes

## Members
- [[ConfigMap stayflexi-config]] - code
- [[Deployment analytics-service]] - code - infrastructure/kubernetes/services/analytics-service/deployment.yaml
- [[Deployment api-gateway]] - code - infrastructure/kubernetes/services/api-gateway/deployment.yaml
- [[Deployment auth-service]] - code - infrastructure/kubernetes/services/auth-service/deployment.yaml
- [[Deployment booking-service]] - code - infrastructure/kubernetes/services/booking-service/deployment.yaml
- [[Deployment hotel-service]] - code - infrastructure/kubernetes/services/hotel-service/deployment.yaml
- [[Deployment inventory-service]] - code - infrastructure/kubernetes/services/inventory-service/deployment.yaml
- [[Deployment notification-service]] - code - infrastructure/kubernetes/services/notification-service/deployment.yaml
- [[Deployment organization-service]] - code - infrastructure/kubernetes/services/organization-service/deployment.yaml
- [[HPA analytics-service-hpa]] - code - infrastructure/kubernetes/services/analytics-service/hpa.yaml
- [[HPA api-gateway-hpa]] - code - infrastructure/kubernetes/services/api-gateway/hpa.yaml
- [[HPA auth-service-hpa]] - code - infrastructure/kubernetes/services/auth-service/hpa.yaml
- [[HPA booking-service-hpa]] - code - infrastructure/kubernetes/services/booking-service/hpa.yaml
- [[HPA hotel-service-hpa]] - code - infrastructure/kubernetes/services/hotel-service/hpa.yaml
- [[HPA inventory-service-hpa]] - code - infrastructure/kubernetes/services/inventory-service/hpa.yaml
- [[HPA notification-service-hpa]] - code - infrastructure/kubernetes/services/notification-service/hpa.yaml
- [[HPA organization-service-hpa]] - code - infrastructure/kubernetes/services/organization-service/hpa.yaml
- [[Job prisma-migrate]] - code - infrastructure/kubernetes/jobs/prisma-migrate.yaml
- [[Secret stayflexi-db-secret]] - code
- [[Secret stayflexi-jwt-secret]] - code
- [[Secret stayflexi-redis-secret]] - code
- [[Secret stayflexi-service-secret]] - code
- [[Service analytics-service]] - code - infrastructure/kubernetes/services/analytics-service/service.yaml
- [[Service api-gateway]] - code - infrastructure/kubernetes/services/api-gateway/service.yaml
- [[Service auth-service]] - code - infrastructure/kubernetes/services/auth-service/service.yaml
- [[Service booking-service]] - code - infrastructure/kubernetes/services/booking-service/service.yaml
- [[Service hotel-service]] - code - infrastructure/kubernetes/services/hotel-service/service.yaml
- [[Service inventory-service]] - code - infrastructure/kubernetes/services/inventory-service/service.yaml
- [[Service notification-service]] - code - infrastructure/kubernetes/services/notification-service/service.yaml
- [[Service organization-service]] - code - infrastructure/kubernetes/services/organization-service/service.yaml
- [[ServiceAccount stayflexi-service-account]] - code

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Community_76
SORT file.name ASC
```
