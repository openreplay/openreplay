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

        # Initialize the database - will use system default locale
        ${POSTGRES_BIN_DIR}/initdb -D "${PGDATA}" -U "${POSTGRES_USER}" --auth=trust

        echo "PostgreSQL database initialized successfully"
    fi

    # Always create/update config files in Bitnami conf directory
    echo "Creating PostgreSQL configuration files..."

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
shared_preload_libraries = '${POSTGRESQL_SHARED_PRELOAD_LIBRARIES}'

# Memory settings
shared_buffers = 128MB
effective_cache_size = 512MB
EOF

    # Create pg_hba.conf in /opt/bitnami/postgresql/conf
    cat >"${POSTGRES_CONF_DIR}/pg_hba.conf" <<EOF
# PostgreSQL Client Authentication Configuration File
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
host    all             all             0.0.0.0/0               md5
EOF

    # Set password and create database if this is first run
    if [ ! -f "${PGDATA}/.initialized" ]; then
        echo "Running first-time setup..."

        # Start PostgreSQL temporarily with Bitnami-style config
        ${POSTGRES_BIN_DIR}/pg_ctl -D "${PGDATA}" \
            -o "--config-file=${POSTGRES_CONF_DIR}/postgresql.conf --hba_file=${POSTGRES_CONF_DIR}/pg_hba.conf" \
            -w start

        # Set password if provided
        if [ -n "${POSTGRES_PASSWORD}" ]; then
            ${POSTGRES_BIN_DIR}/psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" <<-EOSQL
                ALTER USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';
EOSQL
        fi

        # Create database if specified and different from default
        if [ "${POSTGRES_DB}" != "postgres" ]; then
            ${POSTGRES_BIN_DIR}/psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" <<-EOSQL
                CREATE DATABASE ${POSTGRES_DB};
EOSQL
        fi

        # Stop PostgreSQL
        ${POSTGRES_BIN_DIR}/pg_ctl -D "${PGDATA}" -m fast -w stop

        # Mark as initialized
        touch "${PGDATA}/.initialized"

        echo "First-time setup completed"
    fi
}

# Main execution
if [ "${1}" = 'postgres' ]; then
    configure_postgresql

    # Start PostgreSQL with Bitnami-style paths
    exec ${POSTGRES_BIN_DIR}/postgres \
        -D "${PGDATA}" \
        --config-file=${POSTGRES_CONF_DIR}/postgresql.conf \
        --external_pid_file=${POSTGRES_TMP_DIR}/postgresql.pid \
        --hba_file=${POSTGRES_CONF_DIR}/pg_hba.conf
else
    exec "$@"
fi
