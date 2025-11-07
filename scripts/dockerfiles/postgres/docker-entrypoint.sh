#!/bin/bash
set -e

# Configure PostgreSQL based on environment variables
configure_postgresql() {
    # Set PostgreSQL configuration directory
    POSTGRES_CONF_DIR="${POSTGRESQL_VOLUME_DIR}/conf"
    mkdir -p "${POSTGRES_CONF_DIR}"

    # Initialize database if not already initialized
    if [ ! -s "${PGDATA}/PG_VERSION" ]; then
        echo "Initializing PostgreSQL database..."
        
        # Initialize the database as user 1001
        /usr/bin/initdb -D "${PGDATA}" -U "${POSTGRES_USER}" --auth=trust
        
        # Create postgresql.conf with custom settings
        cat >> "${PGDATA}/postgresql.conf" <<EOF

# Custom configuration
port = ${POSTGRESQL_PORT_NUMBER}
shared_preload_libraries = '${POSTGRESQL_SHARED_PRELOAD_LIBRARIES}'
log_hostname = ${POSTGRESQL_LOG_HOSTNAME}
log_connections = ${POSTGRESQL_LOG_CONNECTIONS}
log_disconnections = ${POSTGRESQL_LOG_DISCONNECTIONS}
client_min_messages = ${POSTGRESQL_CLIENT_MIN_MESSAGES}
EOF

        # Update pg_hba.conf for proper authentication
        cat > "${PGDATA}/pg_hba.conf" <<EOF
# PostgreSQL Client Authentication Configuration File
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
host    all             all             0.0.0.0/0               md5
EOF

        # Start PostgreSQL temporarily to create user and database
        /usr/bin/pg_ctl -D "${PGDATA}" -w start

        # Set password if provided
        if [ -n "${POSTGRES_PASSWORD}" ]; then
            /usr/bin/psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" <<-EOSQL
                ALTER USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';
EOSQL
        fi

        # Create database if specified and different from default
        if [ "${POSTGRES_DB}" != "postgres" ]; then
            /usr/bin/psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" <<-EOSQL
                CREATE DATABASE ${POSTGRES_DB};
EOSQL
        fi

        # Stop PostgreSQL
        /usr/bin/pg_ctl -D "${PGDATA}" -m fast -w stop
        
        echo "PostgreSQL database initialized successfully"
    fi
}

# Main execution
if [ "${1}" = 'postgres' ]; then
    configure_postgresql
    
    # Start PostgreSQL
    exec /usr/bin/postgres -D "${PGDATA}"
else
    exec "$@"
fi
