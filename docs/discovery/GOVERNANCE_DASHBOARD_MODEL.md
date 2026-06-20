# Governance Dashboard Model — Stayflexi Platform

This document describes the user interface layouts, metric widget indicators, and data queries designed for the orchestrator's compliance dashboard.

---

## 1. Dashboard Interface Wireframe Layout

The governance interface highlights security drifts, pending human reviews, and policy violations to guarantee system compliance.

```text
+----------------------------------------------------------------------------------+
|                           STAYFLEXI GOVERNANCE CONSOLE                           |
+------------------------------------+---------------------------------------------+
|  [PENDING APPROVALS WIDGET]        |  [OPEN RISKS & DRIFTS WIDGET]               |
|  - PR #284 (Medium Risk - CRS: 48) |  - Security compliance rate: 100%           |
|  - PR #291 (High Risk - CRS: 72)   |  - Architecture drift: 0 orphaned columns    |
+------------------------------------+---------------------------------------------+
|  [POLICY VIOLATIONS AUDIT LOG]                                                   |
|  - [TIMESTAMP] BLOCKED: Direct DB Access by Controller (services/booking-service)|
|  - [TIMESTAMP] BLOCKED: Unauthorized package install (lodash v4.17.21)            |
+----------------------------------------------------------------------------------+
```

---

## 2. Dashboard Widgets & Metric Indicators

### 1. Open Risks

- **Indicator Widget**: Line chart graphing Composite Risk Scores (CRS) for all active feature branches, highlighting technical, security, and performance vectors.
- **Query**:
  `MATCH (c:Change {status: "EVALUATED"}) RETURN c.id, c.compositeRiskScore, c.riskLevel`

### 2. Pending Approvals

- **Indicator Widget**: Action card list containing change IDs, authors, risk score gauges, and links to generated [Change Impact Reports](file:///C:/Stayflexi/docs/discovery/IMPACT_REPORT_TEMPLATE.md).
- **Query**:
  `MATCH (c:Change {status: "PENDING_REVIEW"}) RETURN c.id, c.author, c.compositeRiskScore`

### 3. Policy Violations

- **Indicator Widget**: Stacked bar chart logging block counts categorized by rule: Direct DB Access, Unauthorized Package, Circular Dependency, and Unapproved Schema.
- **Query**:
  `MATCH (v:ViolationLog) RETURN v.timestamp, v.ruleBreached, v.offendingFile`

### 4. Compliance Status

- **Indicator Widget**: Circular gauges showing compliance rates for Security, Architecture, Process, and Deployment vectors.
- **Query**:
  `MATCH (s:ComplianceMetrics) RETURN s.securityScore, s.architectureScore, s.deploymentScore`

### 5. Architecture Drift

- **Indicator Widget**: Comparison grid displaying mismatches between the active codebase and Neo4j schemas. Tracks undocumented endpoints, orphaned columns, or features that lack registered user journeys.
- **Query**:
  `MATCH (e:Endpoint) WHERE NOT (e)<-[:EXPOSES]-(:Feature) RETURN e.route AS OrphanedEndpoint`
