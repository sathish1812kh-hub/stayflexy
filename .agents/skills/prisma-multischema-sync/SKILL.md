---
name: prisma-multischema-sync
description: >
  Manages multi-file Prisma schemas (src/database/prisma/schema/*.prisma) and PostgreSQL database migrations across Stayflexi microservices.
  Use when editing Prisma models, adding database relations, generating client types, or validating non-breaking database schema migrations.
argument-hint: '[generate|migrate|validate]'
license: MIT
---

# Prisma Multi-Schema Sync

This skill governs multi-file schema management and database migration safety for the Stayflexi PostgreSQL relational database.

## Multi-File Schema Structure

Prisma models are split by domain in `src/database/prisma/schema/`:

- `pms.prisma`: Core property management, room types, rates, folios.
- `auth.prisma`: User identities, roles, permissions, invitations.
- `booking.prisma`: Reservations, guest stays, cancellation policies.
- `payment.prisma`: Transactions, invoices, night audits.

## Operational Workflow

1. **Schema Modifications**: Edit domain `.prisma` files in `src/database/prisma/schema/`.
2. **Compile & Generate**:
   ```bash
   npx prisma generate
   ```
3. **Verify PostgreSQL Health via MCP**:
   Call `postgres-mcp` tool `query` to verify live table schemas and index structures on port `5432`.
4. **Non-Breaking Migrations (Golden Path Tenet 9)**:
   - Zero column drops without two-phase deprecation.
   - Non-null additions must specify default values.
   - Add indices concurrently for large transaction tables.
