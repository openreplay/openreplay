{{/* # vim: ft=helm: */}}
# vim: ft=yaml
services:

  postgresql:
    image: ghcr.io/openreplay/postgres:${POSTGRES_VERSION}
    container_name: postgres
    volumes:
      - pgdata:/bitnami/postgresql
    networks:
      openreplay-net:
        aliases:
          - postgresql.db.svc.cluster.local
    environment:
      POSTGRESQL_PASSWORD: "{{.Values.global.postgresql.postgresqlPassword}}"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10

  clickhouse:
    image: clickhouse/clickhouse-server:${CLICKHOUSE_VERSION}
    container_name: clickhouse
    volumes:
      - clickhouse:/var/lib/clickhouse
    networks:
      openreplay-net:
        aliases:
          - clickhouse-openreplay-clickhouse.db.svc.cluster.local
    environment:
      CLICKHOUSE_USER: "default"
      CLICKHOUSE_PASSWORD: ""
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: "1"
    healthcheck:
      test: ["CMD-SHELL", "clickhouse-client --query 'SELECT 1'"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: ghcr.io/openreplay/valkey:${REDIS_VERSION}
    container_name: redis
    volumes:
      - redisdata:/data
    networks:
      openreplay-net:
        aliases:
          - redis-master.db.svc.cluster.local
    environment:
      ALLOW_EMPTY_PASSWORD: "yes"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 10

  minio:
    image: docker.io/rustfs/rustfs:${MINIO_VERSION}
    container_name: minio
    volumes:
      - miniodata:/data
    networks:
      openreplay-net:
        aliases:
          - minio.db.svc.cluster.local
    ports:
      - 9001:9001
    environment:
      RUSTFS_ACCESS_KEY: {{.Values.minio.global.minio.accessKey}}
      RUSTFS_SECRET_KEY: {{.Values.minio.global.minio.secretKey}}
      RUSTFS_ADDRESS: "0.0.0.0:9000"
      RUSTFS_CONSOLE_ENABLE: "true"
      RUSTFS_CONSOLE_ADDRESS: "0.0.0.0:9001"
      RUSTFS_VOLUMES: "/data"
    healthcheck:
      test: ["CMD-SHELL", "curl -so /dev/null http://localhost:9000/ || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 10

  fs-permission:
    image: debian:stable-slim
    container_name: fs-permission
    profiles:
      - "migration"
    volumes:
      - shared-volume:/mnt/efs
      - miniodata:/mnt/minio
      - pgdata:/mnt/postgres
    entrypoint:
      - /bin/bash
      - -c
      - |
        chown -R 1001:1001 /mnt/{efs,postgres}
        chown -R 10001:10001 /mnt/minio
    restart: on-failure

  minio-migration:
    image: ghcr.io/openreplay/minio:2025
    container_name: minio-migration
    profiles:
      - "migration"
    depends_on:
      minio:
        condition: service_healthy
      fs-permission:
        condition: service_completed_successfully
    networks:
      - openreplay-net
    volumes:
      - ./migration-files/minio.sh:/tmp/minio.sh
    environment:
      MINIO_HOST: http://minio.db.svc.cluster.local:9000
      MINIO_ACCESS_KEY: {{.Values.minio.global.minio.accessKey}}
      MINIO_SECRET_KEY: {{.Values.minio.global.minio.secretKey}}
    user: root
    entrypoint:
      - /bin/bash
      - -c
      - |
          # Wait for Minio to be ready
          until bash -c 'echo > /dev/tcp/minio/9000' 2>/dev/null; do
              echo "Waiting for Minio server to be ready..."
              sleep 1
          done
          bash /tmp/minio.sh init || exit 100

  db-migration:
    image: ghcr.io/openreplay/postgres:${POSTGRES_VERSION}
    container_name: db-migration
    profiles:
      - "migration"
    depends_on:
      postgresql:
        condition: service_healthy
      minio-migration:
        condition: service_completed_successfully
    networks:
      - openreplay-net
    volumes:
      - ./migration-files/init_pg_schema.sql:/tmp/init_schema.sql
    environment:
      PGHOST: postgresql
      PGPORT: 5432
      PGDATABASE: postgres
      PGUSER: postgres
      PGPASSWORD: {{.Values.global.postgresql.postgresqlPassword}}
    entrypoint:
      - /bin/bash
      - -c
      - |
          until psql -c '\q'; do
          echo "PostgreSQL is unavailable - sleeping"
          sleep 1
          done
          echo "PostgreSQL is up - executing command"
          psql -v ON_ERROR_STOP=1 -f /tmp/init_schema.sql

  clickhouse-migration:
    image: clickhouse/clickhouse-server:${CLICKHOUSE_VERSION}
    container_name: clickhouse-migration
    profiles:
      - "migration"
    depends_on:
      clickhouse:
        condition: service_healthy
      minio-migration:
        condition: service_completed_successfully
    networks:
      - openreplay-net
    volumes:
      - ./migration-files/init_ch_schema.sql:/tmp/init_schema.sql
    environment:
      CH_HOST: "{{.Values.global.clickhouse.chHost}}"
      CH_PORT: "{{.Values.global.clickhouse.service.dataPort}}"
      CH_PORT_HTTP: "{{.Values.global.clickhouse.service.webPort}}"
      CH_USERNAME: "{{.Values.global.clickhouse.username}}"
      CH_PASSWORD: "{{.Values.global.clickhouse.password}}"
    entrypoint:
      - /bin/bash
      - -c
      - |
          # Checking variable is empty. Shell independant method.
          # Wait for Minio to be ready
          until nc -z -v -w30 {{.Values.global.clickhouse.chHost}} {{.Values.global.clickhouse.service.dataPort}}; do
              echo "Waiting for Minio server to be ready..."
              sleep 1
          done

          echo "clickhouse is up - executing command"
          clickhouse-client -h {{.Values.global.clickhouse.chHost}} --user {{.Values.global.clickhouse.username}} --port {{.Values.global.clickhouse.service.dataPort}} --multiquery < /tmp/init_schema.sql || true

  {{- define "service" -}}
  {{- $service_name := . }}
  {{- $container_name := (splitList "-" $service_name) | first | printf "%s" }}
  {{print $service_name}}:
    {{- $version_var := printf "${%s_VERSION}" ($container_name | upper) }}
    image: public.ecr.aws/p1t3u8a3/{{$container_name}}:{{$version_var}}
    domainname: app.svc.cluster.local
    container_name: {{print $container_name}}
    networks:
      openreplay-net:
        aliases:
          - {{print $container_name}}-openreplay
          - {{print $container_name}}-openreplay.app.svc.cluster.local
    volumes:
      - shared-volume:/mnt/efs
    env_file:
      - docker-envs/{{print $container_name}}.env
    depends_on:
      postgresql:
        condition: service_healthy
      redis:
        condition: service_healthy
      clickhouse:
        condition: service_healthy
      minio:
        condition: service_healthy
    environment: {}  # Fallback empty environment if env_file is missing
    restart: unless-stopped
  {{ end -}}

  {{- range $file := split "," (env "FILES")}}
  {{ template "service" $file}}
  {{- end}}

  nginx-openreplay:
    image: nginx:latest
    container_name: nginx
    networks:
      - openreplay-net
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    restart: unless-stopped


  caddy:
    image: caddy:latest
    container_name: caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - openreplay-net
    environment:
      - ACME_AGREE=true # Agree to Let's Encrypt Subscriber Agreement
      - CADDY_DOMAIN=${CADDY_DOMAIN}
    restart: unless-stopped


volumes:
  pgdata:
  clickhouse:
  redisdata:
  miniodata:
  shared-volume:
  caddy_data:
  caddy_config:

networks:
  openreplay-net:
