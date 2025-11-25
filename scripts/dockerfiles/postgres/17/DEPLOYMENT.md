# PostgreSQL 17 Deployment Guide

## Container User Configuration

The container runs as **non-root user 1001** by default.

```dockerfile
USER 1001
```

## Kubernetes Deployment

### Required Security Contexts

```yaml
spec:
  securityContext:
    fsGroup: 1001           # Volume permissions
  containers:
  - name: postgresql
    securityContext:
      runAsUser: 1001       # Container user
```

### How It Works

1. **Container runs as user 1001** (set in Dockerfile)
2. **Volume mounted with fsGroup 1001** (Kubernetes sets group ownership)
3. **Entrypoint fixes permissions** to 0700 (PostgreSQL requirement)

### Directory Permissions

```bash
# After mount with fsGroup: 1001
/bitnami/postgresql/        # drwxrwxr-x root:1001
/bitnami/postgresql/data/   # drwx------ 1001:root (after entrypoint fix)
```

### Configuration Files Location

Configuration files are **NOT** in the volume:

```
Container filesystem:
/opt/bitnami/postgresql/
├── bin/          # Binaries
├── conf/         # Config files (postgresql.conf, pg_hba.conf)
└── tmp/          # PID file

Volume mount:
/bitnami/postgresql/
└── data/         # PostgreSQL data only
```

## Environment Variables

### Required
- `POSTGRES_PASSWORD` - Database password (from Secret)

### Optional
- `POSTGRES_USER` - Superuser name (default: postgres)
- `POSTGRES_DB` - Default database (default: postgres)
- `POSTGRESQL_PORT_NUMBER` - Port (default: 5432)
- `POSTGRESQL_SHARED_PRELOAD_LIBRARIES` - Extensions (default: pg_stat_statements)

## Health Checks

### Liveness Probe
```yaml
livenessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - exec pg_isready -U "postgres" -d "dbname=postgres" -h 127.0.0.1 -p 5432
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
```

### Readiness Probe
```yaml
readinessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - exec pg_isready -U "postgres" -d "dbname=postgres" -h 127.0.0.1 -p 5432
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
```

## PostgreSQL Process

The container starts PostgreSQL with:

```bash
/opt/bitnami/postgresql/bin/postgres \
  -D /bitnami/postgresql/data \
  --config-file=/opt/bitnami/postgresql/conf/postgresql.conf \
  --external_pid_file=/opt/bitnami/postgresql/tmp/postgresql.pid \
  --hba_file=/opt/bitnami/postgresql/conf/pg_hba.conf
```

## Troubleshooting

### Permission Issues

If you see:
```
FATAL: data directory has invalid permissions
DETAIL: Permissions should be u=rwx (0700)
```

**Solution:** The entrypoint automatically fixes this. If it still fails:
1. Check volume is mounted at `/bitnami/postgresql`
2. Verify fsGroup is set to 1001
3. Ensure container runs as user 1001

### Volume Mount

Always mount at `/bitnami/postgresql` (not `/bitnami/postgresql/data`):

✅ Correct:
```yaml
volumeMounts:
- name: data
  mountPath: /bitnami/postgresql
```

❌ Wrong:
```yaml
volumeMounts:
- name: data
  mountPath: /bitnami/postgresql/data
```

## Quick Deploy

```bash
# 1. Update image in kubernetes-example.yaml
image: your-registry/postgresql:17

# 2. Update password in Secret

# 3. Deploy
kubectl apply -f kubernetes-example.yaml

# 4. Verify
kubectl get pods
kubectl logs postgresql-0
kubectl exec -it postgresql-0 -- psql -U postgres
```

## Available Extensions

- **pg_stat_statements** - Query performance tracking (preloaded)
- **pg_trgm** - Fuzzy text search
- **pgcrypto** - Cryptographic functions
- **All contrib extensions** - Available via CREATE EXTENSION

Enable in database:
```sql
CREATE EXTENSION pg_trgm;
CREATE EXTENSION pgcrypto;
```
