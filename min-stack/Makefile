# Minimal FOSS ingest stack (http, ender, sink, storage, db, assets + caddy).
# Boots from a throwaway workdir, mirroring the full install.sh env flow:
# source common env -> envsubst the worker env files -> compose up.
#
#   make up      build workdir + start (default)
#   make down    stop and remove volumes
#   make seed    insert a default project so ingest works
#   make logs    tail all service logs
#   make ps      show container status

SHELL := /bin/bash
.ONESHELL:
.DEFAULT_GOAL := up

# Absolute path to this Makefile's directory.
SRC_DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
# docker-envs/ and migration-files/ are the tracked full-stack assets we reuse.
COMPOSE_DIR := $(SRC_DIR)/../scripts/docker-compose
WORK_DIR    ?= /tmp/or-minimal
ENV_FILE    := $(SRC_DIR)/common.env
PROJECT_KEY ?= testkey0000000000001

COMPOSE = docker compose --env-file $(WORK_DIR)/common.env -f $(WORK_DIR)/docker-compose.yaml

.PHONY: up down seed logs ps check-env build-workdir

check-env:
	@if [ ! -f "$(ENV_FILE)" ]; then \
		echo "Missing $(ENV_FILE) — copy it first:"; \
		echo "  cp $(SRC_DIR)/common.env.example $(ENV_FILE)"; \
		exit 1; \
	fi

build-workdir: check-env
	@set -Eeuo pipefail
	rm -rf "$(WORK_DIR)"; mkdir -p "$(WORK_DIR)"
	cp "$(SRC_DIR)/docker-compose.yaml" "$(WORK_DIR)/docker-compose.yaml"
	cp "$(SRC_DIR)/Caddyfile" "$(WORK_DIR)/Caddyfile"
	cp -r "$(COMPOSE_DIR)/docker-envs" "$(COMPOSE_DIR)/migration-files" "$(WORK_DIR)/"
	cp "$(ENV_FILE)" "$(WORK_DIR)/common.env"
	# Expand $${COMMON_*} placeholders in each worker env file, as install.sh does.
	set -a; . "$(WORK_DIR)/common.env"; set +a
	ln -sf common.env "$(WORK_DIR)/.env"
	for f in "$(WORK_DIR)"/docker-envs/*.env; do \
		envsubst < "$$f" > "$$f.tmp" && mv "$$f.tmp" "$$f"; \
	done

up: build-workdir
	@set -Eeuo pipefail
	COMPOSE_PROFILES=migration $(COMPOSE) up -d
	echo "Waiting for Postgres schema (db-migration) ..."
	until COMPOSE_PROFILES=migration $(COMPOSE) ps -a db-migration --format '{{.State}}' 2>/dev/null | grep -q exited; do sleep 2; done
	$(MAKE) --no-print-directory seed || true
	set -a; . "$(WORK_DIR)/common.env"; set +a
	echo "Up. http ingest on host port $${HTTP_PORT:-8080} (tracker ingestPoint: caddy on $${INGEST_PORT:-8095})."

seed:
	@set -Eeuo pipefail
	set -a; . "$(WORK_DIR)/common.env"; set +a
	echo "Seeding project_key=$(PROJECT_KEY) ..."
	$(COMPOSE) exec -T -e PGPASSWORD="$$COMMON_PG_PASSWORD" postgresql \
		psql -U postgres -tAc \
		"INSERT INTO projects (name, active, project_key) \
		 VALUES ('minimal-smoke', true, '$(PROJECT_KEY)') \
		 ON CONFLICT (project_key) DO NOTHING \
		 RETURNING project_id, project_key;"

down:
	@COMPOSE_PROFILES=migration $(COMPOSE) down -v

logs:
	@$(COMPOSE) logs -f

ps:
	@$(COMPOSE) ps
