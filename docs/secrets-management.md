# Secrets Management — External Secrets Operator + Vault

- **Status**: Accepted
- **Date**: 2026-08-28
- **Scope**: All Kubernetes workloads (12 services, gateway, jobs)
- **Related**: `infrastructure/kubernetes/secrets/*`, `infrastructure/secrets/src/secret-store.ts`, `.env.example`

## Summary

Stayflexi no longer stores secrets as inline base64 in Git. Production and
staging secrets are injected at deploy time by **External Secrets Operator
(ESO)** from **HashiCorp Vault (KV v2)**. The legacy `Secret` manifests are
retained as local/CI fallback templates only and contain placeholders.

Deployments consume secrets exclusively via `env.valueFrom.secretKeyRef` —
never `env.value` with literals — so a pod can only see a secret that ESO has
materialised from Vault.

## Architecture

```
Vault (KV v2)  --(Kubernetes auth)-->  SecretStore  --(ExternalSecret)-->  Kubernetes Secret  --(secretKeyRef)-->  Pod env
  secret/stayflexi/*                      stayflexi-vault-backend            stayflexi-*-secret                DATABASE_URL etc.
  secret/stayflexi-staging/*              stayflexi-vault-backend-staging    (same keys, staging suffix)       (same keys)
```

- **Vault paths** (KV v2, under `secret/` mount):
  - `secret/stayflexi/database` → `DATABASE_URL`
  - `secret/stayflexi/jwt` → `JWT_SECRET`
  - `secret/stayflexi/service` → `SERVICE_KEY`
  - `secret/stayflexi/redis` → `REDIS_URL`
  - `secret/stayflexi-staging/*` mirrors the four keys for the staging namespace.

- **SecretStore** (`infrastructure/kubernetes/secrets/secretstore.yaml`):
  - Namespaced `SecretStore` per environment, using Vault Kubernetes auth.
  - Auth role `stayflexi-external-secrets` is bound to the ESO ServiceAccount
    `external-secrets-sa` in namespace `external-secrets`. Vault policy grants
    read-only to `secret/data/stayflexi/*`.

- **ExternalSecret** (`externalsecret-db.yaml`, `externalsecret-app.yaml`):
  - `refreshInterval: 1h` — ESO re-syncs hourly and on `ExternalSecret` update.
  - `target.creationPolicy: Owner` — ESO owns the target `Secret`; `deletionPolicy: Retain` avoids accidental deletion on CR removal.
  - Label `app.kubernetes.io/managed-by: external-secrets` and annotation
    `secretstore.external-secrets.io/name` make the ESO lineage explicit.

- **Consumption** (`infrastructure/kubernetes/services/*/deployment.yaml`):
  - Each Deployment maps secrets via:
    ```yaml
    env:
      - name: DATABASE_URL
        valueFrom:
          secretKeyRef:
            name: stayflexi-db-secret
            key: DATABASE_URL
      - name: JWT_SECRET
        valueFrom:
          secretKeyRef:
            name: stayflexi-jwt-secret
            key: JWT_SECRET
      - name: REDIS_URL
        valueFrom:
          secretKeyRef:
            name: stayflexi-redis-secret
            key: REDIS_URL
      - name: SERVICE_KEY
        valueFrom:
          secretKeyRef:
            name: stayflexi-service-secret
            key: SERVICE_KEY
    ```
  - Direct `value:` literals for secrets are forbidden — CI lint checks reject
    `value: "<"` patterns in `infrastructure/kubernetes/`.

- **Fallback for local dev** (`infrastructure/secrets/src/secret-store.ts`):
  - Application code uses `SecretStore` abstraction that prefers Vault
    (`VAULT_ADDR` + `VAULT_TOKEN`) and falls back to `process.env[KEY]` when
    Vault is absent. This keeps `docker-compose` / `.env` local workflows
    working without a Vault sidecar.

## Vault Setup (cluster-admin, once)

```bash
# Install ESO
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace --set installCRDs=true

# Vault KV v2 (if not already)
vault secrets enable -path=secret kv-v2

# Kubernetes auth for ESO
vault auth enable kubernetes
vault write auth/kubernetes/config kubernetes_host="https://kubernetes.default.svc"

# Policy (read-only)
vault policy write stayflexi-external-secrets - <<EOF
path "secret/data/stayflexi/*" { capabilities = ["read"] }
path "secret/metadata/stayflexi/*" { capabilities = ["read", "list"] }
EOF

# Role bound to ESO SA
vault write auth/kubernetes/role/stayflexi-external-secrets \
  bound_service_account_names=external-secrets-sa \
  bound_service_account_namespaces=external-secrets \
  policies=stayflexi-external-secrets \
  ttl=1h

# Seed secrets (example)
vault kv put secret/stayflexi/database DATABASE_URL='postgresql://user:pass@host:5432/stayflexi?sslmode=require'
vault kv put secret/stayflexi/jwt JWT_SECRET="$(openssl rand -base64 48)"
vault kv put secret/stayflexi/service SERVICE_KEY="$(openssl rand -hex 32)"
vault kv put secret/stayflexi/redis REDIS_URL='rediss://:pass@redis.stayflexi:6380/0'
```

## Kubernetes Apply

```bash
# Order matters: namespace -> SecretStore -> ExternalSecrets -> workloads
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/secrets/secretstore.yaml
kubectl apply -f infrastructure/kubernetes/secrets/externalsecret-db.yaml
kubectl apply -f infrastructure/kubernetes/secrets/externalsecret-app.yaml

# Verify ESO synced
kubectl -n stayflexi get externalsecret
kubectl -n stayflexi get secret stayflexi-db-secret -o yaml  # data should be real base64, not placeholder

# Deployments (they reference the secrets via secretKeyRef)
kubectl apply -f infrastructure/kubernetes/configmap.yaml
kubectl apply -f infrastructure/kubernetes/services/*/deployment.yaml
```

## Local / CI Fallback

For local development without Vault, use `.env` (see `.env.example`):

```bash
cp .env.example .env
# fill DATABASE_URL, JWT_SECRET, SERVICE_KEY, REDIS_URL in .env (placeholders are safe — never committed)
npm run dev:all
```

CI uses the same `.env` approach with injected env vars. The legacy `Secret`
templates (`infrastructure/kubernetes/secrets/{db,app}-secrets.yaml`) are
**not** applied in CI — they contain `<BASE64_ENCODED_...>` placeholders and
are excluded by the `no-hardcoded-secrets` lint rule.

To create a secret locally without ESO (e.g. for `kind` testing):

```bash
kubectl create secret generic stayflexi-db-secret \
  --from-literal=DATABASE_URL='postgresql://user:pass@localhost:5432/stayflexi' \
  -n stayflexi --dry-run=client -o yaml | kubectl apply -f -
```

## Rotation

1. Update Vault: `vault kv put secret/stayflexi/jwt JWT_SECRET='<new>'`.
2. ESO re-syncs within `refreshInterval` (1h) or immediately after:
   `kubectl annotate externalsecret stayflexi-jwt-secret -n stayflexi force-sync="$(date +%s)" --overwrite`.
3. Rolling restart to pick up new env (ESO updates the Secret, but pods need restart):
   `kubectl rollout restart deployment -n stayflexi -l component=backend`.
4. Vault KV v2 retains old versions for rollback (`vault kv get -version=...`).

For in-app rotation without restart, use `infrastructure/secrets/src/secret-store.ts`
`rotate()` against Vault directly and clear the process cache.

## What NOT to Do

- Do not commit real base64 values to `infrastructure/kubernetes/secrets/*.yaml`.
- Do not use `env.value` with literals for `*_SECRET`, `*_KEY`, `*_URL` that are
  secrets. Always `valueFrom.secretKeyRef` or `envFrom`.
- Do not use `stringData` with literals in manifests tracked by Git.
- Do not copy `.env` to `.env.local` with real prod values and commit.

## Verification

```bash
# No hardcoded secrets in repo
rg -n 'BASE64_ENCODED|password|secret' infrastructure/kubernetes/secrets/*.yaml  # should show only placeholders/comments

# Deployments use secretKeyRef
rg -n 'secretKeyRef' infrastructure/kubernetes/services/*/deployment.yaml

# ESO CRDs are valid YAML
kubectl apply --dry-run=client -f infrastructure/kubernetes/secrets/secretstore.yaml
kubectl apply --dry-run=client -f infrastructure/kubernetes/secrets/externalsecret-*.yaml
```

## References

- ESO docs: https://external-secrets.io/latest/
- Vault KV v2: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- `infrastructure/secrets/src/secret-store.ts` — runtime Vault/env fallback
- `infrastructure/kubernetes/secrets/externalsecret-*.yaml` — production manifests
