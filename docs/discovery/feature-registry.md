# Feature Registry — Stayflexi Platform

This registry lists the user-facing capabilities of the Stayflexi platform, their active deployment statuses, and owners.

---

## 1. Feature Map & Mappings

### [FEAT-BOOK-CREATE - Booking Reservation Creation Flow](file:///C:/Stayflexi/docs/discovery/NODE_CATALOG.md#L30)

- **Status**: `PRODUCTION`
- **Owner**: Booking Domain Team
- **Description**: Exposes endpoints and UI widgets enabling guests to make reservation bookings.
- **Relational Map**: `(f:Feature {id: "FEAT-BOOK-CREATE"})-[:USES_SERVICE]->(s:Service {name: "booking-service"})`

### [FEAT-COMP-COMP - Compliance Governance Engine](file:///C:/Stayflexi/docs/discovery/NODE_CATALOG.md#L33)

- **Status**: `RELEASE_CANDIDATE`
- **Owner**: Governance Board Group
- **Description**: Triggers pre-commit checks blocking unapproved packages and circular imports.
- **Relational Map**: `(f:Feature {id: "FEAT-COMP-COMP"})-[:USES_SERVICE]->(s:Service {name: "workflow-service"})`

### [FEAT-AUTH-LOGIN - Multi-Factor Authentication login](file:///C:/Stayflexi/docs/discovery/NODE_CATALOG.md#L33)

- **Status**: `PRODUCTION`
- **Owner**: Core Auth Team
- **Description**: Validates session cookies, user credentials, and JWT tokens.
- **Relational Map**: `(f:Feature {id: "FEAT-AUTH-LOGIN"})-[:USES_SERVICE]->(s:Service {name: "auth-service"})`
