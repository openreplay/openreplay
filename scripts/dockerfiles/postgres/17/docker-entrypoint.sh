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

    # Validate password is provided (support both POSTGRES_PASSWORD and POSTGRESQL_PASSWORD for Bitnami compatibility)
    PASSWORD="${POSTGRES_PASSWORD:-${POSTGRESQL_PASSWORD}}"
    if [ -z "${PASSWORD}" ]; then
        echo "ERROR: POSTGRES_PASSWORD or POSTGRESQL_PASSWORD must be set" >&2
        exit 1
    fi

    # Initialize database if not already initialized
    if [ ! -s "${PGDATA}/PG_VERSION" ]; then
        echo "Initializing PostgreSQL database..."

        # Initialize the database with trust auth initially - we'll set password and restrict later
        ${POSTGRES_BIN_DIR}/initdb -D "${PGDATA}" -U "${POSTGRES_USER}" --auth-local=trust --auth-host=trust

        echo "PostgreSQL database initialized successfully"
    fi

    # Always create/update config files in Bitnami conf directory
    echo "Creating PostgreSQL configuration files..."

    # Filter out pgaudit/pg_audit from shared_preload_libraries if present
    FILTERED_PRELOAD_LIBRARIES=$(echo "${POSTGRESQL_SHARED_PRELOAD_LIBRARIES}" | sed -E 's/(pgaudit|pg_audit),?//g' | sed 's/,(pgaudit|pg_audit)//g' | sed 's/,,/,/g' | sed 's/^,//;s/,$//')

    # Warn if pgaudit was filtered out
    if [[ "${POSTGRESQL_SHARED_PRELOAD_LIBRARIES}" =~ (pgaudit|pg_audit) ]]; then
        echo "WARNING: pgaudit extension is not available in this PostgreSQL image and will be skipped"
        echo "Filtered shared_preload_libraries: ${FILTERED_PRELOAD_LIBRARIES}"
    fi

    # Override the environment variable so pg_ctl doesn't pick up pgaudit
    export POSTGRESQL_SHARED_PRELOAD_LIBRARIES="${FILTERED_PRELOAD_LIBRARIES}"

    # Set password and create database if this is first run
    if [ ! -f "${PGDATA}/.initialized" ]; then
        echo "Running first-time setup..."

        # Create bootstrap postgresql.conf - no network listeners during init
        cat >"${POSTGRES_CONF_DIR}/postgresql.conf" <<EOF
# PostgreSQL configuration file (bootstrap mode)
data_directory = '${PGDATA}'
port = ${POSTGRESQL_PORT_NUMBER}
listen_addresses = ''
max_connections = 100
hba_file = '${POSTGRES_CONF_DIR}/pg_hba.conf'
external_pid_file = '${POSTGRES_TMP_DIR}/postgresql.pid'
log_hostname = ${POSTGRESQL_LOG_HOSTNAME}
log_connections = ${POSTGRESQL_LOG_CONNECTIONS}
log_disconnections = ${POSTGRESQL_LOG_DISCONNECTIONS}
client_min_messages = ${POSTGRESQL_CLIENT_MIN_MESSAGES}
shared_preload_libraries = '${FILTERED_PRELOAD_LIBRARIES}'
shared_buffers = 128MB
effective_cache_size = 512MB
EOF

        # Create bootstrap pg_hba.conf - local socket trust only
        cat >"${POSTGRES_CONF_DIR}/pg_hba.conf" <<EOF
# Bootstrap mode - local socket only, no network
local   all             all                                     trust
EOF

        # Start PostgreSQL for initialization
        ${POSTGRES_BIN_DIR}/pg_ctl -D "${PGDATA}" \
            -o "--config-file=${POSTGRES_CONF_DIR}/postgresql.conf --hba_file=${POSTGRES_CONF_DIR}/pg_hba.conf" \
            -w start

        # Set password using local socket with trust auth
        ${POSTGRES_BIN_DIR}/psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" -d postgres <<-EOSQL
            ALTER USER "${POSTGRES_USER}" WITH PASSWORD '${PASSWORD}';
EOSQL

        # Create database if specified and different from default
        if [ "${POSTGRES_DB}" != "postgres" ]; then
            ${POSTGRES_BIN_DIR}/psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" -d postgres <<-EOSQL
                CREATE DATABASE "${POSTGRES_DB}";
EOSQL
        fi

        # Stop PostgreSQL
        ${POSTGRES_BIN_DIR}/pg_ctl -D "${PGDATA}" -m fast -w stop

        # Mark as initialized
        touch "${PGDATA}/.initialized"

        echo "First-time setup completed"
    fi

    # Write final postgresql.conf - enable remote connections after initialization
    echo "Enabling remote connections..."
    cat >"${POSTGRES_CONF_DIR}/postgresql.conf" <<EOF
# PostgreSQL configuration file
data_directory = '${PGDATA}'
port = ${POSTGRESQL_PORT_NUMBER}
listen_addresses = '*'
max_connections = 100
hba_file = '${POSTGRES_CONF_DIR}/pg_hba.conf'
external_pid_file = '${POSTGRES_TMP_DIR}/postgresql.pid'
log_hostname = ${POSTGRESQL_LOG_HOSTNAME}
log_connections = ${POSTGRESQL_LOG_CONNECTIONS}
log_disconnections = ${POSTGRESQL_LOG_DISCONNECTIONS}
client_min_messages = ${POSTGRESQL_CLIENT_MIN_MESSAGES}
shared_preload_libraries = '${FILTERED_PRELOAD_LIBRARIES}'
shared_buffers = 128MB
effective_cache_size = 512MB
EOF

    # Write final pg_hba.conf with password auth
    cat >"${POSTGRES_CONF_DIR}/pg_hba.conf" <<EOF
# PostgreSQL Client Authentication Configuration File
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
host    all             all             0.0.0.0/0               md5
EOF
}

# Refresh collation version in background after PostgreSQL starts
refresh_collation_background() {
    local password="${POSTGRES_PASSWORD:-${POSTGRESQL_PASSWORD}}"
    (
        # Wait for PostgreSQL to be ready
        until ${POSTGRES_BIN_DIR}/pg_isready -U "${POSTGRES_USER}" -h 127.0.0.1 -p "${POSTGRESQL_PORT_NUMBER}" >/dev/null 2>&1; do
            sleep 1
        done

        # Refresh collation version for all databases
        PGPASSWORD="${password}" ${POSTGRES_BIN_DIR}/psql -h 127.0.0.1 -p "${POSTGRESQL_PORT_NUMBER}" -v ON_ERROR_STOP=0 --username "${POSTGRES_USER}" -d postgres -t -A -c "SELECT datname FROM pg_database WHERE datname NOT IN ('template0');" 2>/dev/null | while read -r dbname; do
            if [ -n "$dbname" ]; then
                PGPASSWORD="${password}" ${POSTGRES_BIN_DIR}/psql -h 127.0.0.1 -p "${POSTGRESQL_PORT_NUMBER}" -v ON_ERROR_STOP=0 --username "${POSTGRES_USER}" -d "$dbname" -c "ALTER DATABASE \"$dbname\" REFRESH COLLATION VERSION;" >/dev/null 2>&1 || true
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
