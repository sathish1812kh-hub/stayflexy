# PostgreSQL High Availability & Disaster Recovery Architecture

## 1. HA Topology

- **Primary Node**: Read/Write on Port 5432
- **Streaming Replication**: Synchronous/Asynchronous standby replicas
- **WAL Archiving**: Continuous WAL shipping with Point-In-Time Recovery (PITR)

## 2. SLA Targets

- **Recovery Time Objective (RTO)**: $\le$ 15 minutes
- **Recovery Point Objective (RPO)**: $\le$ 5 minutes
