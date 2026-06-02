---
type: community
cohesion: 0.33
members: 6
---

# Community 363

**Cohesion:** 0.33 - loosely connected
**Members:** 6 nodes

## Members
- [[Alertmanager Configuration]] - code - infrastructure/monitoring/alertmanager/alertmanager.yaml
- [[Grafana Datasources Configuration]] - code - infrastructure/monitoring/grafana/provisioning/datasources/datasources.yaml
- [[Loki Configuration]] - code - infrastructure/monitoring/loki/loki-config.yaml
- [[Prometheus Alerts]] - code - infrastructure/monitoring/prometheus/alerts.yaml
- [[Prometheus Configuration]] - code - infrastructure/monitoring/prometheus/prometheus.yaml
- [[Prometheus Recording Rules]] - code - infrastructure/monitoring/prometheus/recording-rules.yaml

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Community_363
SORT file.name ASC
```
