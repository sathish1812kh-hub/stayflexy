# Neo4j Setup Plan — Stayflexi Platform

This document outlines the version requirements, deployment mode, local container setup, security policies, and backup strategy for the Neo4j Knowledge Graph.

---

## 1. Neo4j Version & Deployment Mode

- **Version**: Neo4j 5.20.0 (LTS) — selected for stability, Cypher performance optimizations, and native compatibility with vector indexes.
- **Local Setup**: Executed as a Docker container sidecar alongside local microservices.
- **Production Deployment**: Deployed via Helm inside Kubernetes as a StatefulSet using Neo4j Community or Enterprise Edition.

---

## 2. Local Development Setup (`docker-compose.yml` addition)

The local instance is exposed via Bolt and HTTP protocols:

```yaml
neo4j:
  image: neo4j:5.20.0-community
  container_name: stayflexi-neo4j
  ports:
    - '7474:7474' # HTTP Browser Console
    - '7687:7687' # Bolt Protocol Interface
  volumes:
    - neo4j_data:/data
    - neo4j_import:/import
    - neo4j_plugins:/plugins
  environment:
    - NEO4J_AUTH=neo4j/stayflexi-dev-pass
    - NEO4J_PLUGINS=["apoc"] # Install APOC utilities
    - NEO4J_dbms_memory_heap_initial__size=512m
    - NEO4J_dbms_memory_heap_max__size=1g
  networks:
    - stayflexi-network
```

---

## 3. Security Configuration

- **Authentication**: Enforce Bolt connection verification using JWT or native basic authentication.
- **RBAC Scopes (Roles)**:
  - `admin`: Full schema alterations and data insertions.
  - `architect`: Run Cypher queries and schema design validation checks.
  - `reader`: Read-only queries for monitoring dashboards and visual inspection.
- **Encryption**: TLS 1.3 enabled on port `7687` for all cross-service Bolt traffic.

---

## 4. Backup Strategy

- **Local / Staging**: Scripted daily Cypher schema dumps exported to `.sql` equivalent Cypher files.
- **Production**: Automated Kubernetes CronJob executing `neo4j-admin database backup` at `03:00 UTC` daily.
- **Storage**: Backup files compressed (gzip) and uploaded to AWS S3 (`stayflexi-backups-s3` bucket) with a 30-day retention policy.
- **Disaster Recovery Gate**: Dry-run restore verification test executed weekly in a sandboxed staging environment.
