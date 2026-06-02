---
type: community
cohesion: 0.67
members: 3
---

# Community 404

**Cohesion:** 0.67 - moderately connected
**Members:** 3 nodes

## Members
- [[Pricing Engine Service]] - code - infrastructure/kubernetes/services/pricing-engine-service/service.yaml
- [[Pricing Engine Service Deployment]] - code - infrastructure/kubernetes/services/pricing-engine-service/deployment.yaml
- [[Pricing Engine Service HPA]] - code - infrastructure/kubernetes/services/pricing-engine-service/hpa.yaml

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Community_404
SORT file.name ASC
```
