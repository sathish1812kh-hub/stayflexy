---
name: event-saga-validator
description: >
  Audits and validates Kafka event schemas, Redis Streams publishers/subscribers, and distributed Saga transaction choreographies across Stayflexi microservices.
  Use when designing asynchronous events, Outbox pattern tables, compensation actions, or checking distributed trace continuity.
argument-hint: '[saga-name|topic-name]'
license: MIT
---

# Event & Saga Choreography Validator

This skill ensures distributed consistency and transactional reliability for event-driven workflows across Stayflexi services.

## Core Patterns

1. **Transactional Outbox Pattern (ADR-0004)**:
   - State mutation and event record must execute inside the same PostgreSQL transaction.
   - Outbox poller / CDC processes events reliably into Kafka.
2. **Idempotent Event Consumers**:
   - Every consumer must track processed `eventId` in Redis or PostgreSQL to prevent double execution.
3. **Saga Compensations**:
   - Multi-service workflows (e.g. `BookingCreated` $\rightarrow$ `PaymentAuthorized` $\rightarrow$ `InventoryLocked`) must declare explicit compensation actions for every failure step.

## Event Schema Location

- Central event schemas and TypeScript types reside in `packages/shared-events/src/`.
