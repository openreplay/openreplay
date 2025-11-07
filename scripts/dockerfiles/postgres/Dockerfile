FROM cgr.dev/chainguard/wolfi-base

# Install PostgreSQL 17 with contrib extensions (no pgaudit)
RUN apk add --no-cache \
    postgresql-17 \
    postgresql-17-contrib \
    postgresql-17-client \
    bash && \
    # Create bitnami-style directories
    mkdir -p /bitnami/postgresql/data && \
    mkdir -p /bitnami/postgresql/conf && \
    chown -R 1001:1001 /bitnami/postgresql

# Environment variables
ENV BITNAMI_DEBUG="false" \
    POSTGRESQL_PORT_NUMBER="5432" \
    POSTGRESQL_VOLUME_DIR="/bitnami/postgresql" \
    PGDATA="/bitnami/postgresql/data" \
    POSTGRES_USER="postgres" \
    POSTGRES_DB="postgres" \
    POSTGRESQL_ENABLE_LDAP="no" \
    POSTGRESQL_ENABLE_TLS="no" \
    POSTGRESQL_LOG_HOSTNAME="false" \
    POSTGRESQL_LOG_CONNECTIONS="false" \
    POSTGRESQL_LOG_DISCONNECTIONS="false" \
    POSTGRESQL_CLIENT_MIN_MESSAGES="error" \
    POSTGRESQL_SHARED_PRELOAD_LIBRARIES="pg_stat_statements"

# Copy custom entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER 1001

EXPOSE 5432

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["postgres"]
