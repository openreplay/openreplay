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
# Build with default settings (local/postgresql:17)
make build

# Build with custom repo/name/version
make build repo=myrepo name=postgres version=18
# Produces: myrepo/postgres:18
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

Run the complete test suite:

```bash
# Test with default settings
make test

# Test with custom version
make test version=18
```

This will:
1. Build the image
2. Start a test container
3. Run all test scripts:
   - Container health and connectivity tests
   - Database operations (CRUD) tests
   - Extension functionality tests
4. Clean up the test container

**Note**: Always run tests through `make test` to ensure correct image version and configuration.

## Available Make Targets

```bash
make help    # Show all available targets
make build   # Build PostgreSQL image
make test    # Build and run full test suite
make push    # Build and push to registry
make dev     # Build and run interactively
make clean   # Remove test containers and images
make kube    # Build and push for Kubernetes
```

## Directory Structure

```
# Bitnami-compatible structure (container filesystem)
/opt/bitnami/postgresql/
├── bin/               # PostgreSQL binaries (symlinks)
│   ├── postgres
│   ├── pg_ctl
│   ├── initdb
│   └── psql
├── conf/              # Configuration files (not in volume)
│   ├── postgresql.conf
│   └── pg_hba.conf
└── tmp/               # Runtime files
    └── postgresql.pid

# Volume mount (persisted data only)
/bitnami/postgresql/
└── data/              # PostgreSQL data directory (PGDATA)
```

**PostgreSQL Startup Command:**
```bash
/opt/bitnami/postgresql/bin/postgres \
  -D /bitnami/postgresql/data \
  --config-file=/opt/bitnami/postgresql/conf/postgresql.conf \
  --external_pid_file=/opt/bitnami/postgresql/tmp/postgresql.pid \
  --hba_file=/opt/bitnami/postgresql/conf/pg_hba.conf
```

**Important**: All configuration files are in `/opt/bitnami/postgresql/conf/` (container), **not in the volume**. This allows:
- Data to persist across container restarts
- Configuration updates via image rebuilds without affecting data
- Full Bitnami compatibility

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
