---
source_file: "infrastructure/kubernetes/services/hotel-service/deployment.yaml"
type: "code"
community: "Community 76"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Community_76
---

# Deployment hotel-service

## Connections
- [[ConfigMap stayflexi-config]] - `references` [EXTRACTED]
- [[HPA hotel-service-hpa]] - `references` [EXTRACTED]
- [[Secret stayflexi-db-secret]] - `references` [EXTRACTED]
- [[Secret stayflexi-jwt-secret]] - `references` [EXTRACTED]
- [[Secret stayflexi-redis-secret]] - `references` [EXTRACTED]
- [[Secret stayflexi-service-secret]] - `references` [EXTRACTED]
- [[Service hotel-service]] - `references` [EXTRACTED]
- [[ServiceAccount stayflexi-service-account]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Community_76