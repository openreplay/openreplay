# PostgreSQL 17 Docker Image

PostgreSQL 17.6 container image compatible with Bitnami-style deployment patterns.

## Features

- PostgreSQL 17.6
- Runs as non-root user (UID 1001)
- Bitnami-compatible directory structure (`/bitnami/postgresql`)
- Pre-configured with extensions:
  - pg_stat_statements (query performance tracking)
  - pg_trgm (fuzzy text matching and similarity search)
  - pgcrypto (cryptographic functions)
  - And all standard contrib extensions
- Support for fsGroup security context

## Build

```bash
make build
```

## Run

### Local Development

```bash
make dev
```

### Kubernetes Deployment

The image is designed to work with the following Kubernetes configuration:

```yaml
securityContext:
  fsGroup: 1001
containers:
  - name: postgresql
    image: local/postgresql:17
    securityContext:
      runAsUser: 1001
    env:
      - name: POSTGRES_PASSWORD
        valueFrom:
          secretKeyRef:
            name: postgresql
            key: postgresql-password
    volumeMounts:
      - name: data
        mountPath: /bitnami/postgresql
```

## Environment Variables

- `POSTGRES_USER` - PostgreSQL superuser (default: postgres)
- `POSTGRES_PASSWORD` - PostgreSQL superuser password (required)
- `POSTGRES_DB` - Default database name (default: postgres)
- `POSTGRESQL_PORT_NUMBER` - PostgreSQL port (default: 5432)
- `POSTGRESQL_VOLUME_DIR` - Data volume directory (default: /bitnami/postgresql)
- `PGDATA` - PostgreSQL data directory (default: /bitnami/postgresql/data)
- `POSTGRESQL_SHARED_PRELOAD_LIBRARIES` - Shared preload libraries (default: pg_stat_statements)

## Testing

Run the test suite:

```bash
# Start container in background
podman run -d --name postgres-test \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres123 \
  local/postgresql:17

# Run tests
./test_postgres.sh

# Test database operations
./create_test_object.sh

# Cleanup
podman stop postgres-test
podman rm postgres-test
```

## Directory Structure

```
/bitnami/postgresql/
├── data/           # PostgreSQL data directory (PGDATA)
└── conf/           # Configuration files
```

## Available Extensions

The image includes all contrib extensions. Enable them with:

```sql
CREATE EXTENSION pg_trgm;      -- Fuzzy text search and similarity
CREATE EXTENSION pgcrypto;     -- Cryptographic functions (hashing, encryption)
CREATE EXTENSION pg_stat_statements;  -- Query performance tracking
-- And many more from contrib package
```

## Security

- Container runs as user 1001 (non-root)
- Compatible with fsGroup security contexts
- Supports Kubernetes securityContext constraints
- Includes pgcrypto for password hashing and encryption
