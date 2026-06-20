# Graphiti Memory Entity Design — Stayflexi Platform

This document describes the schema properties, update frequencies, data retention rules, and trust ratings for the Graphiti memory structures.

---

## 1. Core Memory Entities Spec

### A. Requirement Memory

- **Purpose**: Remembers product definitions and regulations.
- **Fields**: `id: String`, `title: String`, `summary: String`, `domain: String`, `rulesEnforced: String[]`.
- **Retention Strategy**: **Permanent**. Never deleted unless explicitly deprecated by a product release.
- **Update Strategy**: Scrapes updates from product markdown files when changed.
- **Confidence Strategy**: High (`1.0`) if mapped to design plans containing Context Anchors.

### B. Feature Memory

- **Purpose**: Preserves user-facing functionality state.
- **Fields**: `featureId: String`, `name: String`, `status: String`, `linkedPages: String[]`, `verificationStatus: String`.
- **Retention Strategy**: **Permanent**. Mark as `DEPRECATED` rather than deleting.
- **Update Strategy**: Refreshes when E2E Playwright test statuses change in CI.
- **Confidence Strategy**: `1.0` if validated by a passing E2E Playwright test suite, `0.6` if untested.

### C. Decision Memory

- **Purpose**: Logs architectural decisions (ADRs).
- **Fields**: `decisionId: String`, `title: String`, `rationale: String`, `status: String`, `alternatives: String[]`.
- **Retention Strategy**: **Permanent**.
- **Update Strategy**: Scans new frontmatter tags in ADR files.
- **Confidence Strategy**: `1.0` for approved records, `0.7` for draft configurations.

### D. Incident Memory

- **Purpose**: Remembers system outages, performance locks, and DLQ errors.
- **Fields**: `incidentId: String`, `service: String`, `errorMessage: String`, `timestamp: DateTime`, `remediationSteps: String`.
- **Retention Strategy**: **90 Days**. Older logs are archived to file logs.
- **Update Strategy**: Refreshed when a critical error occurs or a warning is raised in Pino streams.
- **Confidence Strategy**: Derived from direct system logs (`0.95`).

### E. Runtime Memory

- **Purpose**: Telemetry parameters tracking.
- **Fields**: `metricName: String`, `avgValue: Float`, `p99Latency: Float`, `sampleCount: Integer`.
- **Retention Strategy**: **30 Days** (rolling averages).
- **Update Strategy**: Extracted hourly from Prometheus scraped variables.
- **Confidence Strategy**: `1.0` since it relies on native Prometheus scraped metrics.
