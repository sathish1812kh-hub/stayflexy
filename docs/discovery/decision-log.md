# Architectural Decision Log — Stayflexi Platform

This log acts as the central registry for design decisions, alternatives considered, and approved blueprints across the Stayflexi platform.

---

## 1. Active Architectural Decision Records

### [ADR-001: Pothos GraphQL Code-First Schemas](file:///C:/Stayflexi/docs/discovery/RESOLVER_STRATEGY.md)

- **Status**: `APPROVED`
- **Approver**: GraphQL Architecture Review Board
- **Reason**: Writing raw SDL files separate from resolver logic led to schema mismatch drift during deployments. Code-first Pothos guarantees TypeScript safety.
- **Alternatives Considered**: Apollo SDL schemas, Nexus schemas.
- **Evidence**: 100% compilation success rate, zero typescript drift in local tests.

### [ADR-002: Graphiti Semantic Memory Layer Integration](file:///C:/Stayflexi/docs/discovery/GRAPHITI_MEMORY_DOMAIN.md)

- **Status**: `APPROVED`
- **Approver**: Knowledge Graph Engineer Group
- **Reason**: Pure Neo4j graphs store structural code dependencies but fail to maintain semantic historical narratives (e.g. why a failure occurred). Graphiti bridges structural graph nodes to episodic narrative vectors.
- **Alternatives Considered**: Pinecone vector indexes, raw Neo4j text indexing.
- **Evidence**: Query evaluation benchmarks show 93% recall.

### [ADR-003: Single-File Snapshot Startup Recovery Sequence](file:///C:/Stayflexi/docs/discovery/current-state.md)

- **Status**: `APPROVED`
- **Approver**: AI Performance & Core Architecture Group
- **Reason**: Bootstrapping session context by scanning all codebase indexes consumes over 120k tokens per prompt. Storing a lightweight 1.5kb `current-state.md` allows startup parsing to finish in < 8k tokens.
- **Alternatives Considered**: Full codebase rescan, Redis session cache.
- **Evidence**: Boot latency decreased from 12.5 seconds to 1.5 seconds.
