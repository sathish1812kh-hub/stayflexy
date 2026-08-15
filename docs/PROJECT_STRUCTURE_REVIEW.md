# Stayflexi Project Structure Review

**Overall score: 756 / 1000**

This is a strong, ambitious platform, not a weak project. A score of 756 means the foundations are credible and many important engineering choices are already in place. The missing 244 points represent the work needed to make a large system easier to change, validate, and operate as more teams and features are added.

**CodeGraph code-structure score: 744 / 1000**

CodeGraph reaches a slightly lower result because it follows more code-level relationships and exposes unresolved references, direct cross-root calls, and import cycles. This is a project-structure score from the CodeGraph evidence. It is different from the health of the CodeGraph index itself, which scores **705 / 1000** because only 43.5% of attempted code relationships resolve in the current database.

## Scope and confidence

This review is based on the existing Graphify snapshot in [graphify-out](../graphify-out/GRAPH_REPORT.md), the workspace configuration, and current package layout. The graph contains 9,154 nodes, 16,835 edges, and 576 communities. Of the graph edges, 16,764 are extracted directly from source and 71 are inferred, so the dependency observations are primarily evidence-based.

The graph report itself was generated from a 1,459-file corpus in May/June 2026. A later detector found 1,604 files, and the worktree currently has many changes. Treat the score as a well-supported structural baseline, not a substitute for a fresh graph update before making a release decision.

## Score breakdown

| Area                                     |          Score | Why it scored this way                                                                                                                                                                                                      |
| ---------------------------------------- | -------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture and domain separation       |      180 / 220 | Twelve domain services and clear internal layers are a real strength. The top-level application and services both carry API and domain responsibilities, which makes the ownership boundary less clear.                     |
| Monorepo and package organization        |      150 / 190 | Workspaces, Turbo, shared packages, and infrastructure packages give the repository an intentional shape. Package dependency breadth is higher than the domain model needs.                                                 |
| Maintainability and dependency clarity   |      125 / 170 | The graph is navigable, but it has 576 communities, including 166 tiny ones, and several very high-degree shared abstractions. This raises the cost of understanding change impact.                                         |
| Testing and validation                   |      115 / 150 | There are 96 test/spec files, strict TypeScript settings, service-level Jest commands, and Playwright coverage. The default root commands do not give one obvious whole-platform quality gate.                              |
| Infrastructure and operational readiness |      125 / 150 | Gateway, discovery, event bus, observability, secrets, deployment, and resilience material show serious production intent. The remaining gap is enforcing service boundaries operationally, not adding more infrastructure. |
| Repository hygiene and change signal     |       61 / 120 | Generated Graphify artefacts, caches, and helper scripts are tracked at scale, and the current worktree has substantial unrelated change noise. This makes it harder to see the code that matters in a review.              |
| **Total**                                | **756 / 1000** | **A capable enterprise foundation that needs stronger boundaries and cleaner operating discipline.**                                                                                                                        |

## What is already strong

- The domain split is thoughtful: booking, inventory, payment, hotel, organization, OTA, pricing, revenue management, notifications, analytics, authentication, and workflow are represented as separate services.
- Services use a recognisable layered layout: application, domain, infrastructure, interfaces, tests, and workers/sagas where the domain needs them. [Booking service](../services/booking-service) is a representative example.
- Shared building blocks exist for authentication, configuration, database access, errors, events, logging, observability, types, and validation. This reduces accidental reinvention.
- The root TypeScript configuration is appropriately strict, and the repository has both service-level tests and browser/API test tooling. See [package.json](../package.json) and [tsconfig.json](../tsconfig.json).
- The graph identifies meaningful system flows, including booking creation, OTA synchronization, event-driven consumers, and shared data infrastructure. Those are signs of a real platform rather than a collection of unrelated endpoints.

## Why the score is below 800

### 1. The main application and microservices overlap in responsibility

The top-level `src/` tree contains API routes, modules, database access, and domain-oriented code, while `services/` contains twelve domain services with similar responsibilities. That can be a valid transition architecture, but the repository does not make the long-term rule obvious:

- Is `src/` only a frontend and backend-for-frontend layer?
- Which location is the canonical home for booking, inventory, payment, and organization rules?
- Can the root application call service databases or internal domain modules directly?

Without a firm answer, the same business rule can slowly appear in two places. That increases onboarding time, makes fixes less predictable, and is the biggest architectural reason points were withheld.

**What good looks like:** make `src/` explicitly a UI/BFF boundary, or explicitly a modular monolith. Do not leave it as both at once. Document which APIs and events are the only supported way to reach each service.

### 2. Shared packages are too universal

Every one of the twelve services declares all nine shared packages as dependencies. This is convenient, but it means a change to a supposedly shared concern has a platform-wide blast radius by default.

For example, a service that only needs logging and configuration should not automatically be coupled to database access, events, validation, authentication, types, and observability packages. Wide dependency declarations also make it harder to tell which services truly participate in a capability.

**What good looks like:** keep only direct dependencies in each service, split heavy shared packages into smaller focused packages where necessary, and give shared packages clear owners and compatibility rules.

### 3. Several abstractions have a large change blast radius

The highest-degree graph nodes are shared cross-cutting utilities:

| Abstraction          | Graph connections | Interpretation                                                                   |
| -------------------- | ----------------: | -------------------------------------------------------------------------------- |
| `handleRouteError()` |               187 | A change in response/error policy could affect a large part of the API surface.  |
| `Logger`             |               155 | Expected as a common utility, but it needs a stable and narrow contract.         |
| `fromPrismaError()`  |               128 | Persistence failures are translated centrally across many callers.               |
| `wrapZod()`          |               108 | Validation behavior is centralised, so a subtle change can alter many endpoints. |
| `SuccessResponse`    |               101 | Response formatting is widely shared and should be versioned carefully.          |

High connectivity is not automatically bad. It becomes a problem when these components contain business-specific behavior, change often, or lack focused contract tests. The graph says these areas deserve extra review discipline because a small edit can create a broad regression.

**What good looks like:** keep these utilities deliberately small, test their contracts independently, and put domain-specific policy behind service-owned adapters instead of expanding the global helpers.

### 4. The graph is more fragmented than the architecture should be

Graphify found 576 communities, with 166 of them containing one or two nodes. Some fragmentation is normal in a large TypeScript monorepo, especially around tests and configuration. This many small islands nevertheless makes it harder to answer simple questions such as "what changes when payment behavior changes?"

The graph also shows many generic, unlabeled communities. That is partly a graph-labelling limitation, but it also reflects scattered concepts that do not form obvious bounded contexts.

**What good looks like:** group a service's tests, adapters, schemas, workers, and contracts around a named capability; remove abandoned duplicate utilities; and maintain explicit dependency rules between bounded contexts.

### 5. Cross-service workflows are central but not visibly governed

The graph identifies booking creation, OTA synchronization, and event-driven consumer groups that span services. It also infers links between workflow-service and gateway configuration. Those inferred links need manual confirmation, but they point to a real risk: orchestration can become the place where every service knows too much about every other service.

The direct graph evidence also shows that package-to-service relationships dominate cross-root connections. That supports the earlier point about a very broad shared platform layer.

**What good looks like:** define each workflow as a documented saga with event contracts, retry/idempotency rules, ownership, and failure paths. Keep service-to-service dependencies contract-based, not implementation-based.

### 6. Quality gates are split instead of being impossible to miss

The repository has good tools, but their scope is distributed:

- Root `lint` and `type-check` target the top-level `src/` application.
- Services have their own test and type-check commands.
- The root has additional `lint:services`, `type-check:all`, and `test:services` commands.
- The root `test` command is Playwright-focused.

This is workable, but it asks contributors and CI to remember the correct combination. The root [tsconfig.json](../tsconfig.json) also excludes services, packages, infrastructure, and platform validation, so a passing root type check is not a platform-wide guarantee.

**What good looks like:** add one documented CI command that runs formatting, root checks, workspace checks, unit tests, integration tests, and contract tests with clear pass/fail ownership.

### 7. Generated output is drowning out the change signal

There are 11,106 tracked files under `graphify-out/`, including extraction caches, chunks, helper scripts, and large generated graph data. The current `.gitignore` does not exclude this directory. The worktree also has 1,327 changed paths at the time of review.

Some graph outputs may be valuable to preserve, but transient cache and extraction artefacts make code review noisier and make it easier to miss a meaningful source change. The worktree count may include legitimate work in progress, so it is a repository-health signal rather than a judgement on any individual change.

**What good looks like:** decide which graph outputs are intentional deliverables, retain only those, ignore reproducible caches and chunks, and keep generated or build outputs out of ordinary feature diffs.

## Priority improvement plan

### First: remove avoidable review noise

1. Keep a small, intentional set of graph artefacts such as `GRAPH_REPORT.md` and perhaps `graph.json`; ignore cache files, extraction chunks, prompts, and temporary scripts.
2. Add a root `ci` command that runs the complete quality suite across the application, services, packages, infrastructure, and platform validation.
3. Make the graph refresh part of an intentional architecture review process, rather than tracking every intermediate graph generation file.

### Next: make ownership boundaries explicit

1. Publish a one-page rule for `src/`: frontend/BFF only, modular monolith, or another clearly named role.
2. For every service, define its owned data, public APIs/events, and prohibited imports/calls.
3. Add automated boundary checks for forbidden cross-service imports and direct database access outside the owning service.

### Then: reduce coupling where it pays off

1. Remove unused shared-package dependencies from each service.
2. Create contract tests for the five highest-degree shared abstractions.
3. Treat workflow orchestration as a product boundary with versioned events, idempotency guarantees, retry policy, and observability standards.

## CodeGraph review

CodeGraph provides a newer, code-focused view than the Graphify report. Its full SQLite index was rebuilt on 5 August 2026 and accounts for all 1,345 canonical source/configuration files in its supported scope. The database integrity check passes, no indexed file is stale, no parse errors were recorded, and every stored edge has valid source and target nodes. Those are good signs: the index is safe to query and has a sound structural foundation.

### What CodeGraph sees

| Signal                           |        Result | Why it matters                                                                                                     |
| -------------------------------- | ------------: | ------------------------------------------------------------------------------------------------------------------ |
| Indexed files                    |         1,345 | CodeGraph covers the code/config corpus it discovered.                                                             |
| Canonical source/config coverage | 1,345 / 1,345 | No hand-written supported source or configuration files are missing.                                               |
| Code nodes                       |        12,651 | The AST-level model is detailed enough for symbol and impact analysis.                                             |
| Stored edges                     |        35,579 | It captures containment, calls, imports, references, instantiation, inheritance, and implementation relationships. |
| Resolved relationships           |        24,369 | These are usable for reliable code navigation.                                                                     |
| Unresolved relationships         |        31,712 | Every unresolved reference is marked `failed`; this materially reduces confidence in broad impact analysis.        |
| Relationship resolution rate     |         43.5% | Too low for an automated "what will this change break?" answer without manual review.                              |
| Circular import groups           |             2 | Small but real cycles exist in hotel GraphQL schemas and `shared-events`.                                          |

### Why CodeGraph scores the structure at 744

CodeGraph confirms many of the strengths from Graphify: the repository has a substantial typed codebase, a clean local CodeGraph ignore policy, no broken stored edges, and useful high-level abstractions. It also identifies the same high-blast-radius areas, such as `handleRouteError`, `Logger`, response/types helpers, and `IEventPublisher`.

The lower score is driven by three code-level findings:

1. **Relationship resolution is incomplete.** Of 56,081 attempted non-containment relationships, 31,712 remain unresolved. Many misses are expected external or dynamic names such as `Promise`, `Date`, Jest matchers, React hooks, and Zod builders. However, unresolved workspace imports such as `@stayflexi/shared-logger` show that internal package and path-alias resolution also needs configuration.
2. **The root application and services are directly coupled.** CodeGraph records 818 cross-root call edges between `services/` and `src/`, plus substantial package-to-service import and call edges. These connections deserve an explicit policy so the architecture does not drift into direct implementation coupling.
3. **Two import cycles need removal.** One is among hotel GraphQL schema files (`hotel.ts`, `room.ts`, and `roomType.ts`); the other is between `packages/shared-events/src/dlq.ts` and `packages/shared-events/src/index.ts`. They are small, but shared packages and GraphQL schemas are exactly where cycles tend to grow quietly.

### Why the CodeGraph index itself is only 705

This score evaluates the usefulness of the generated graph, not the product code.

- It earns high marks for freshness, integrity, full discovery accounting, zero parser errors, and zero dangling edges.
- It loses most points because every unresolved relation has the final `failed` status, rather than being classified as external, dynamic, unsupported, or pending.
- It does not create semantic nodes for 85 YAML files. For a platform with substantial infrastructure and deployment configuration, that leaves part of the operational architecture outside this graph.

CodeGraph deliberately excludes generated build output such as `dist/`, dependency directories such as `node_modules/`, and `.git/`. It cannot be configured to include those paths, because indexing compiled copies beside their source would duplicate symbols and corrupt dependency analysis. Graphify is the complementary tool for documentation, diagrams, and other non-code project files.

### CodeGraph-specific fixes

1. Configure workspace package aliases, TypeScript paths, and package exports so `@stayflexi/*` imports resolve to local symbols.
2. Add known external packages and test-framework APIs to CodeGraph's resolver or mark them as intentional external dependencies instead of failed references.
3. Model YAML configuration that participates in deployments, observability, service discovery, and event infrastructure.
4. Break the two detected cycles, then add a CI check that rejects new import cycles.
5. Use CodeGraph's high-degree-node list to require contract tests and code-owner review for changes to central utilities.

## Expected score movement

Cleaning generated artefacts and creating a single quality gate should lift day-to-day maintainability quickly. Clarifying the root application versus service ownership model is the high-value change: it reduces duplication risk across every future feature. Completing the plan above would reasonably move the structure into the **820-860 / 1000** range, assuming the boundary rules are enforced in CI rather than remaining documentation only.

## Evidence used

- [Graphify report](../graphify-out/GRAPH_REPORT.md): graph size, communities, high-degree nodes, detected workflows, and inferred cross-boundary links.
- [Root package configuration](../package.json): workspace layout and quality commands.
- [Turbo configuration](../turbo.json): workspace task setup.
- [Root TypeScript configuration](../tsconfig.json): strictness and scope exclusions.
- [Workflow service manifest](../services/workflow-service/package.json): representative service dependency breadth.
- [Git ignore rules](../.gitignore): generated artefact policy.
- [CodeGraph ignore policy](../.codegraph/.gitignore): local graph data is correctly excluded from Git.
- [CodeGraph SQLite index](../.codegraph/codegraph.db): index freshness, integrity, symbol/edge counts, unresolved references, and import-cycle analysis.
