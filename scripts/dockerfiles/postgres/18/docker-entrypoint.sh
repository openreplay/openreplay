#!/bin/bash
set -e

# Bitnami-style paths
POSTGRES_BIN_DIR="/opt/bitnami/postgresql/bin"
POSTGRES_CONF_DIR="/opt/bitnami/postgresql/conf"
POSTGRES_TMP_DIR="/opt/bitnami/postgresql/tmp"

# Configure PostgreSQL based on environment variables
configure_postgresql() {
    # Ensure data directory exists and has correct permissions
    if [ ! -d "${PGDATA}" ]; then
        echo "Creating data directory..."
        mkdir -p "${PGDATA}"
    fi

    # Fix permissions - PostgreSQL requires 0700 or 0750
    echo "Setting data directory permissions..."
    chmod 0700 "${PGDATA}"

    # Initialize database if not already initialized
    if [ ! -s "${PGDATA}/PG_VERSION" ]; then
        echo "Initializing PostgreSQL database..."

        # Initialize the database with secure auth methods: peer for local, scram-sha-256 for network
        ${POSTGRES_BIN_DIR}/initdb -D "${PGDATA}" -U "${POSTGRES_USER}" --auth-local=peer --auth-host=scram-sha-256

        echo "PostgreSQL database initialized successfully"
    fi

    # Always create/update config files in Bitnami conf directory
    echo "Creating PostgreSQL configuration files..."

    # Filter out pg_audit from shared_preload_libraries if present
    FILTERED_PRELOAD_LIBRARIES=$(echo "${POSTGRESQL_SHARED_PRELOAD_LIBRARIES}" | sed 's/pg_audit,\?//g' | sed 's/,pg_audit//g' | sed 's/,,/,/g' | sed 's/^,//;s/,$//')

    # Create postgresql.conf in /opt/bitnami/postgresql/conf
    cat >"${POSTGRES_CONF_DIR}/postgresql.conf" <<EOF
# PostgreSQL configuration file
# Data directory
data_directory = '${PGDATA}'

# Connection settings
port = ${POSTGRESQL_PORT_NUMBER}
listen_addresses = '*'
max_connections = 100

# Authentication
hba_file = '${POSTGRES_CONF_DIR}/pg_hba.conf'

# PID file
external_pid_file = '${POSTGRES_TMP_DIR}/postgresql.pid'

# Logging
log_hostname = ${POSTGRESQL_LOG_HOSTNAME}
log_connections = ${POSTGRESQL_LOG_CONNECTIONS}
log_disconnections = ${POSTGRESQL_LOG_DISCONNECTIONS}
client_min_messages = ${POSTGRESQL_CLIENT_MIN_MESSAGES}

# Extensions
shared_preload_libraries = '${FILTERED_PRELOAD_LIBRARIES}'

# Memory settings
shared_buffers = 128MB
effective_cache_size = 512MB
EOF

    # Create pg_hba.conf in /opt/bitnami/postgresql/conf
    cat >"${POSTGRES_CONF_DIR}/pg_hba.conf" <<EOF
# PostgreSQL Client Authentication Configuration File
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
host    all             all             0.0.0.0/0               scram-sha-256
EOF

    # Set password and create database if this is first run
    if [ ! -f "${PGDATA}/.initialized" ]; then
        echo "Running first-time setup..."

        # Validate password is provided (support both POSTGRES_PASSWORD and POSTGRESQL_PASSWORD for Bitnami compatibility)
        PASSWORD="${POSTGRES_PASSWORD:-${POSTGRESQL_PASSWORD}}"
        if [ -z "${PASSWORD}" ]; then
            echo "ERROR: POSTGRES_PASSWORD or POSTGRESQL_PASSWORD must be set during initialization" >&2
            exit 1
        fi

        # Start PostgreSQL temporarily with localhost-only access for security
        # Override listen_addresses to prevent external connections during password setup
        ${POSTGRES_BIN_DIR}/pg_ctl -D "${PGDATA}" \
            -o "--config-file=${POSTGRES_CONF_DIR}/postgresql.conf --hba_file=${POSTGRES_CONF_DIR}/pg_hba.conf -c listen_addresses=127.0.0.1" \
            -w start

        # Set password
        ${POSTGRES_BIN_DIR}/psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" -v password="${PASSWORD}" <<-EOSQL
            ALTER USER ${POSTGRES_USER} WITH PASSWORD :'password';
EOSQL

        # Create database if specified and different from default
        if [ "${POSTGRES_DB}" != "postgres" ]; then
            ${POSTGRES_BIN_DIR}/psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" <<-EOSQL
                CREATE DATABASE "${POSTGRES_DB}";
EOSQL
        fi

        # Stop PostgreSQL
        ${POSTGRES_BIN_DIR}/pg_ctl -D "${PGDATA}" -m fast -w stop

        # Mark as initialized and password as set
        touch "${PGDATA}/.initialized"
        touch "${PGDATA}/.password_set"

        echo "First-time setup completed"
    fi
}

# Refresh collation version in background after PostgreSQL starts
refresh_collation_background() {
    (
        # Wait for PostgreSQL to be ready
        until ${POSTGRES_BIN_DIR}/pg_isready -U "${POSTGRES_USER}" -h 127.0.0.1 -p "${POSTGRESQL_PORT_NUMBER}" >/dev/null 2>&1; do
            sleep 1
        done

        # Refresh collation version for all databases
        ${POSTGRES_BIN_DIR}/psql -v ON_ERROR_STOP=0 --username "${POSTGRES_USER}" -d postgres -t -A -c "SELECT datname FROM pg_database WHERE datname NOT IN ('template0');" | while read -r dbname; do
            if [ -n "$dbname" ]; then
                ${POSTGRES_BIN_DIR}/psql -v ON_ERROR_STOP=0 --username "${POSTGRES_USER}" -d "$dbname" -c "ALTER DATABASE \"$dbname\" REFRESH COLLATION VERSION;" >/dev/null 2>&1 || true
            fi
        done
    ) &
}

# Main execution
if [ "${1}" = 'postgres' ]; then
    configure_postgresql

    # Start background job to refresh collation version after PostgreSQL is ready
    refresh_collation_background

    # Start PostgreSQL with Bitnami-style paths
    exec ${POSTGRES_BIN_DIR}/postgres \
        -D "${PGDATA}" \
        --config-file=${POSTGRES_CONF_DIR}/postgresql.conf \
        --external_pid_file=${POSTGRES_TMP_DIR}/postgresql.pid \
        --hba_file=${POSTGRES_CONF_DIR}/pg_hba.conf
else
    exec "$@"
fi
