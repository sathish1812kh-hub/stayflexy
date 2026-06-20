# Change Impact Report Template

This document provides the standard layout schema for compiling impact analysis findings when proposals or modifications are requested.

---

# Impact Analysis Assessment Report: [CHANGE-ID / TITLE]

> [!IMPORTANT]
> **Summary**: [Insert 1-2 sentence description of the proposed code or schema change.]

## 1. Change Summary

- **Proposed Modification**: [e.g. Add corporate Discount field, Drop booking status constraint]
- **Target Repository/File**: [Insert absolute link to file, e.g. [booking.prisma](file:///C:/Stayflexi/src/database/prisma/schema/booking.prisma)]
- **Trigger Source**: [Orchestrator proposal / Git commit SHA]
- **Timestamp**: `YYYY-MM-DD HH:MM:SS`

---

## 2. Dependency Risk Assessment

| Risk Category        | Score (1-10) | Rating         | Impact Description                                                 |
| :------------------- | :----------- | :------------- | :----------------------------------------------------------------- |
| **Technical Risk**   | [0-10]       | [LOW/MED/HIGH] | [Complexity of change and compiler dependency scope]               |
| **Business Risk**    | [0-10]       | [LOW/MED/HIGH] | [Impact on customer transactions and E2E bookings]                 |
| **Security Risk**    | [0-10]       | [LOW/MED/HIGH] | [Exposure of fields or access privileges]                          |
| **Performance Risk** | [0-10]       | [LOW/MED/HIGH] | [Database indexing or JS execution delay issues]                   |
| **Data Risk**        | [0-10]       | [LOW/MED/HIGH] | [Data corruption, migration down-times, or null constraint checks] |

**COMPOSITE RISK SCORE**: `[SCORE] / 100`  
**GATE STATUS**: `[GO / REFER_TO_ARCHITECT / BLOCKED]`

---

## 3. Propagation Scope (Affected Components)

### Affected Features

- [ ] [Feature A](file:///C:/Stayflexi/docs/discovery/NODE_CATALOG.md#L33) - Description of impact.
- [ ] [Feature B](file:///C:/Stayflexi/docs/discovery/NODE_CATALOG.md#L33) - Description of impact.

### Affected APIs & GraphQL Types

- **Endpoints**:
  - `[METHOD] [ROUTE]`
- **GraphQL Fields**:
  - `[Type].[Field]`

### Affected Services

- `[Service Name]` (e.g. `booking-service`)

### Affected Database Tables & Columns

- **Table**: `[Table Name]`
- **Modified Columns**: `[Column Name]`

### Affected UI Components & Layouts

- [Component File Name](file:///C:/Stayflexi/src/app/bookings/page.tsx) - Selector: `[CSS Selector]`

### Affected Test Suites

- [Test Script File](file:///C:/Stayflexi/src/tests/integration/bookJuneRoom101.test.ts)

---

## 4. Required Action Checklist

- [ ] **Database Migration**: Run `npx prisma migrate dev` to validate and compile SQL script safely.
- [ ] **DTO & Validator Synchronization**: Add variables to request schema validators and target TS interfaces.
- [ ] **GraphQL Resolver Updates**: Update type configuration files inside pothos schema builders.
- [ ] **E2E Selector Audit**: Verify visual screenshots match selectors under testing.
- [ ] **Run E2E Verification**: Execute `npx playwright test` to verify no journey failures.
- [ ] **Consistency Gate Check**: Verify Neo4j, Graphiti memory, and codebase structures remain fully synchronized.
