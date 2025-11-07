FROM cgr.dev/chainguard/wolfi-base

# Install PostgreSQL 17 with contrib extensions and locale support
RUN apk add --no-cache \
  postgresql-17 \
  postgresql-17-contrib \
  postgresql-17-client \
  glibc-locale-en \
  bash && \
  # Create user and group with ID 1001
  addgroup -g 1001 postgres || true && \
  adduser -u 1001 -G postgres -s /bin/bash -D postgres || true && \
  # Create Bitnami-style directory structure
  mkdir -p /opt/bitnami/postgresql/bin && \
  mkdir -p /opt/bitnami/postgresql/conf && \
  mkdir -p /opt/bitnami/postgresql/tmp && \
  mkdir -p /bitnami/postgresql/data && \
  # Create symlinks to postgres binaries in Bitnami location
  ln -s /usr/bin/postgres /opt/bitnami/postgresql/bin/postgres && \
  ln -s /usr/bin/pg_ctl /opt/bitnami/postgresql/bin/pg_ctl && \
  ln -s /usr/bin/initdb /opt/bitnami/postgresql/bin/initdb && \
  ln -s /usr/bin/psql /opt/bitnami/postgresql/bin/psql && \
  # Set permissions
  chown -R 1001:1001 /opt/bitnami/postgresql && \
  chown -R 1001:1001 /bitnami/postgresql

# Set locale environment variables
ENV LANG=en_US.UTF-8 \
  LANGUAGE=en_US:en \
  LC_ALL=en_US.UTF-8

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
