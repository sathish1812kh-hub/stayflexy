---
source_file: "infrastructure/kubernetes/services/api-gateway/deployment.yaml"
type: "code"
community: "Community 76"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Community_76
---

# Deployment api-gateway

## Connections
- [[ConfigMap stayflexi-config]] - `references` [EXTRACTED]
- [[HPA api-gateway-hpa]] - `references` [EXTRACTED]
- [[Secret stayflexi-db-secret]] - `references` [EXTRACTED]
- [[Secret stayflexi-jwt-secret]] - `references` [EXTRACTED]
- [[Secret stayflexi-redis-secret]] - `references` [EXTRACTED]
- [[Secret stayflexi-service-secret]] - `references` [EXTRACTED]
- [[Service analytics-service]] - `references` [INFERRED]
- [[Service api-gateway]] - `references` [EXTRACTED]
- [[Service auth-service]] - `references` [INFERRED]
- [[Service booking-service]] - `references` [INFERRED]
- [[Service hotel-service]] - `references` [INFERRED]
- [[Service inventory-service]] - `references` [INFERRED]
- [[Service notification-service]] - `references` [INFERRED]
- [[Service organization-service]] - `references` [INFERRED]
- [[ServiceAccount stayflexi-service-account]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Community_76