# Extraction Engine Plan — Stayflexi Platform

This document describes the design architecture, parsing routines, and scripts used to automate code scanning and map system coordinates to Neo4j.

---

## 1. Extraction Modules Directory

Extraction tools are housed inside `scripts/extractor/` using Node.js and TypeScript:

```
scripts/extractor/
├── main.ts             — Primary orchestrator execution file
├── ast-extractor.ts    — TS AST parser using ts-morph for routes and repositories
├── prisma-extractor.ts — Prisma schema file tokenizer
├── git-extractor.ts    — Git logs commit scraper
├── doc-extractor.ts    — Markdown file parser
└── neo4j-client.ts     — Bolt connection driver wrapper
```

---

## 2. Extraction Pipeline Details

### A. Source Code Parser (AST)

- **Logic**:
  1.  Initialize a `ts-morph` project scope scanning `services/**/*.ts`.
  2.  Find express route registrations (`express.Router()`). Parse route method calls (`.get`, `.post`).
  3.  Extract route path strings (e.g. `"/api/v1/bookings/:id"`) and create `Endpoint` nodes. Link them back to the parent `Service` directory node.
  4.  Inspect database calls inside repository classes. Resolve Prisma schema names (e.g. `db.booking.create` maps to a `WRITES` relationship targeting the `bookings` `DatabaseTable` node).

### B. Database Schema Parser

- **Logic**:
  1.  Read all files inside `src/database/prisma/schema/*.prisma` line by line.
  2.  Tokenize `model <name> { ... }` boundaries. Create a `DatabaseTable` node for each model.
  3.  For each line inside a model block:
      - Extract column variables, types, and directives (e.g. `@id`, `@relation`).
      - Create `DatabaseColumn` nodes and map them to their parent table via `BELONGS_TO`.
      - Generate `DatabaseTable -[:DEPENDS_ON]-> DatabaseTable` relationships based on `@relation` mapping keys.

### C. Git History Parser

- **Logic**:
  1.  Execute shell scripts extracting git metadata:
      ```bash
      git log -n 50 --pretty=format:"%H|%ad|%an|%s" --name-only
      ```
  2.  Parse outputs to create `Release` and `Migration` links. Cross-reference modified file paths to update the corresponding node's `LastModified` attribute in Neo4j.

### D. Playwright Test Suite Scanner

- **Logic**:
  1.  Parse files matching `platform-validation/**/*.test.ts` or `playwright.config.ts`.
  2.  Scrape test descriptions (`describe` / `test` titles) and any custom labels (e.g. `@feature:bookings`).
  3.  Map test file paths to `PlaywrightTest` nodes, connecting them to `Feature` nodes using the `TESTED_BY` relationship.
