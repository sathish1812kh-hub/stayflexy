# Agent Governance Workflow

## Standard Feature Implementation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Task Received                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              platform-architect-agent                       │
│                                                             │
│  1. Identify bounded context (which service owns this?)     │
│  2. Check for cross-service coupling risk                   │
│  3. Validate technology stack compliance                    │
│  4. Approve or reject before domain agent starts            │
└──────────────────────────┬──────────────────────────────────┘
                           │ APPROVED
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Domain Agent                             │
│   (one of: auth, org, hotel, inventory, booking,            │
│    payment, ota, analytics, notification-workflow)          │
│                                                             │
│  1. Implement business logic in owned service               │
│  2. Follow DDD structure: domain → app → infra → interfaces │
│  3. Write unit tests                                        │
│  4. Self-validate against domain invariants checklist       │
└──────────┬──────────────────────────────────────────────────┘
           │ (parallel validation where possible)
           │
    ┌──────┴───────────────────────────────────────┐
    │              │              │                │
    ▼              ▼              ▼                ▼
┌───────┐   ┌──────────┐  ┌──────────┐   ┌──────────────┐
│db-    │   │kafka-    │  │redis-    │   │observability-│
│prisma │   │event     │  │consist.  │   │sre           │
│agent  │   │agent     │  │agent     │   │agent         │
│       │   │          │  │          │   │              │
│Schema │   │Event     │  │Lock/Cache│   │Tracing+      │
│Migr.  │   │Contracts │  │Keys      │   │Metrics       │
└───┬───┘   └────┬─────┘  └────┬─────┘   └──────┬───────┘
    │             │              │                │
    └──────┬──────┘              └───────┬────────┘
           │                             │
           ▼                             ▼
    ┌─────────────────────────────────────────┐
    │           qa-resilience-agent           │
    │                                         │
    │  1. Validate test coverage ≥ threshold  │
    │  2. Run platform-validation suite       │
    │  3. Verify resilience scenarios pass    │
    └─────────────────┬───────────────────────┘
                      │ ALL TESTS PASS
                      ▼
    ┌─────────────────────────────────────────┐
    │     integration-governance-agent        │
    │                                         │
    │  1. Run integration checklist           │
    │  2. Verify no cross-service regressions │
    │  3. Validate API contract stability     │
    │  4. Grant merge approval                │
    └─────────────────┬───────────────────────┘
                      │ APPROVED
                      ▼
    ┌─────────────────────────────────────────┐
    │      infrastructure-devops-agent        │
    │                                         │
    │  1. Validate Docker build               │
    │  2. Validate K8s manifests              │
    │  3. Deploy to staging                   │
    │  4. Validate health checks              │
    │  5. Promote to production               │
    └─────────────────────────────────────────┘
```

---

## Emergency Hotfix Flow

For production incidents requiring immediate fix:

```
Incident Detected
      │
      ▼
observability-sre-agent    → identify root cause from metrics/traces
      │
      ▼
platform-architect-agent   → assess blast radius
      │
      ▼
Domain Agent               → implement minimal fix
      │
      ▼
qa-resilience-agent        → validate fix with targeted tests
      │
      ▼
integration-governance-agent → verify no regression (abbreviated checklist)
      │
      ▼
infrastructure-devops-agent  → emergency deploy (manual approval required)
```

---

## Schema Change Flow

Schema changes have additional safeguards:

```
Domain Agent requests schema change
      │
      ▼
database-prisma-agent validates:
  - Migration is additive (no column removal without plan)
  - Migration runs < 30 seconds
  - Rollback plan exists
  - Indexes added for new foreign keys
      │
      ▼
platform-architect-agent validates:
  - Change stays within bounded context
  - No cross-service schema coupling
      │
      ▼
qa-resilience-agent validates:
  - Migration tested against representative data volume
      │
      ▼
integration-governance-agent:
  - Runs prisma migrate deploy in staging
  - Verifies all services start successfully after migration
```

---

## Conflict Resolution Protocol

When two agents want to modify the same file:

```
1. Both agents state their requirement to integration-governance-agent
2. integration-governance-agent identifies the PRIMARY OWNER (per README.md registry)
3. Primary owner makes the change
4. Requesting agent reviews the diff and approves
5. Both agents update their GEMINI.md ownership docs if needed
6. platform-architect-agent approves if change affects shared interfaces
```

---

## Agent Spawn Guidelines

When using Gemini CLI's Agent tool to spawn a specialized agent:

```typescript
Agent({
  description: "Implement inventory overbooking prevention fix",
  prompt: `
You are the inventory-consistency-agent. Read agents/inventory-consistency-agent/GEMINI.md first.
Context: [describe the specific task]
Constraint: Only modify files in services/inventory-service/src/
Validation: Run validation checklist from your GEMINI.md before completing.
  `
})
```

Each agent spawn should:
1. Reference the agent's GEMINI.md as its operating instructions
2. State the specific task and files in scope
3. Specify which validation checklist to run
4. State the expected output (code change, test file, doc update)
