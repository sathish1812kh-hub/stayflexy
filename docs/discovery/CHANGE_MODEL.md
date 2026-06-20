# Change intelligence Change Model — Stayflexi Platform

This document catalogs and designs the change schemas, properties, and event logs tracked by the orchestrator to assess codebase and model updates.

---

## 1. Supported Change Types & Event Schemas

The Impact Analysis engine listens to git commits, AST parses, and schema adjustments to detect ten specific change classifications. Each change event requires specific data attributes.

### Change Specifications Table

| Change Type                | Detection Mechanism                                                                           | Event Attributes                                                 | Impact Range                                         |
| :------------------------- | :-------------------------------------------------------------------------------------------- | :--------------------------------------------------------------- | :--------------------------------------------------- |
| **New Feature**            | AST check of feature catalog, addition of configuration file.                                 | `featureId`, `name`, `targetRoutes[]`, `capabilities[]`          | New code blocks, new testing templates.              |
| **Feature Update**         | Modified functions in services workspace folder.                                              | `featureId`, `modifiedFiles[]`, `addedRules[]`, `removedRules[]` | Refactoring, endpoint contracts.                     |
| **Feature Removal**        | Git file deletion, deprecation flag updates.                                                  | `featureId`, `deprecatedDate`, `fallbackPlan`                    | Dangling endpoints, orphaned database tables.        |
| **New Endpoint**           | Route registration in `Express` entrypoints.                                                  | `route`, `method`, `service`, `payloadDto`, `authRequired`       | Direct network mapping, new tests.                   |
| **Endpoint Change**        | Alteration of parameters, query fields, or responses.                                         | `route`, `method`, `oldSchemaHash`, `newSchemaHash`              | DTO breaking shifts, frontend component fetch logic. |
| **Database Change**        | Modified Prisma schemas: [\*.prisma](file:///C:/Stayflexi/src/database/prisma/schema/) files. | `table`, `column`, `action` (Add, Drop, Alter), `dataType`       | Data migrator scripts, Repository layers.            |
| **UI Change**              | Next.js Page/Layout edits in [src/app/](file:///C:/Stayflexi/src/app/).                       | `fileLocation`, `selectorsModified[]`, `stateHooks[]`            | Discovered DOM maps, E2E journey tests.              |
| **Package Change**         | Additions/upgrades in `package.json` configurations.                                          | `packageName`, `oldVersion`, `newVersion`, `isShared`            | Dependency trees, compiler compliance.               |
| **GraphQL Change**         | Pothos code-first schemas updates or resolver edits.                                          | `typeName`, `fieldName`, `action` (Add, Deprecate, Alter)        | Apollo Gateway composition, client-side queries.     |
| **External System Change** | Integration endpoint updates (Stripe, Airbnb, OTAs).                                          | `systemName`, `contractVersion`, `webhookRoute`                  | Payment pipelines, booking synchronization tasks.    |

---

## 2. Ingestion Event Schema Definition

Every identified change compiles into a standardized JSON payload structure:

```json
{
  "$schema": "http://stayflexi.com/schemas/change-event.json",
  "changeId": "CHG-20260620-001",
  "timestamp": "2026-06-20T19:13:15Z",
  "author": "AntigravityOrchestrator",
  "type": "DATABASE_COLUMN_ALTER",
  "source": "src/database/prisma/schema/booking.prisma",
  "details": {
    "tableName": "bookings",
    "columnName": "customerType",
    "action": "ADD",
    "dataType": "String",
    "constraints": ["Nullable"]
  },
  "commitHash": "9b1fb2d"
}
```

This change object is fed directly into the propagation pipeline to determine affected down-stream nodes.
