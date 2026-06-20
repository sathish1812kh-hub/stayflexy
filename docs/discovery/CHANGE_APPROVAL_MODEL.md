# Change Approval Model — Stayflexi Platform

This document describes the validation policies, review rules, and mandatory testing gates targeting Feature, Database, API, GraphQL, and Infrastructure modifications.

---

## 1. Approval Gate Matrix

Proposed changes must satisfy specific validation criteria to receive approvals.

| Change Domain              | Primary Verification Tool                                                                               | Mandatory Review Level                      | Policy Thresholds                                                                                      |
| :------------------------- | :------------------------------------------------------------------------------------------------------ | :------------------------------------------ | :----------------------------------------------------------------------------------------------------- |
| **Feature Changes**        | [DUPLICATE_INTELLIGENCE_MODEL.md](file:///C:/Stayflexi/docs/discovery/DUPLICATE_INTELLIGENCE_MODEL.md). | Technical Lead review.                      | Duplicate score must be < 50% (`NOT_FOUND`). Concurrency tests must pass.                              |
| **Database Changes**       | Prisma Migrator & AST Check.                                                                            | DBA & Architect signature (if destructive). | Non-destructive edits auto-approved. Destructive edits (drops) blocked.                                |
| **API Changes**            | Zod Contract Diffs check.                                                                               | API Gateway owner review.                   | No removed fields from payloads. Method alterations require deprecation cycles.                        |
| **GraphQL Changes**        | Apollo Rover composition check.                                                                         | GraphQL Architect signature.                | Federated gateway schema must compose without errors.                                                  |
| **Infrastructure Changes** | Env check & Helm dry-run.                                                                               | DevOps SRE approval.                        | Mandatory env parameters must resolve to vault configs. CPU/RAM limits must fit pod namespace budgets. |

---

## 2. Validation Details by Domain

### 1. Feature Changes Validation

- **Criteria**: AI models cannot commit features that duplicate or conflict with existing capabilities. E2E browser tests must exist.
- **Verification Hook**: Check that E2E validation scripts are present in the [integration/](file:///C:/Stayflexi/src/tests/integration/) directory.

### 2. Database Changes Validation

- **Criteria**: Modifying tables and columns must maintain multi-tenant constraints (`organizationId`).
- **Verification Hook**: If schema modifications alter table indexes or drop database elements in [C:/Stayflexi/src/database/prisma/schema/](file:///C:/Stayflexi/src/database/prisma/schema/), block automated pipelines and require dba overrides.

### 3. API Changes Validation

- **Criteria**: REST endpoints contracts must not break backwards compatibility.
- **Verification Hook**: Verify that input schemas in [packages/shared-validation/](file:///C:/Stayflexi/packages/) do not delete required fields.

### 4. GraphQL Changes Validation

- **Criteria**: Graph schemas modifications must compose successfully at the gateway level.
- **Verification Hook**: Execute Apollo Rover checks to ensure resolving functions align with types.

### 5. Infrastructure Changes Validation

- **Criteria**: Updates to docker files or container limits must not compromise Kubernetes cluster scheduling.
- **Verification Hook**: Confirm memory resource allocations do not exceed namespace threshold boundaries.
