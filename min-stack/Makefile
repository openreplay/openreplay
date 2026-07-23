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
.DEFAULT_GOAL := help

# Absolute path to this Makefile's directory.
SRC_DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
# docker-envs/ and migration-files/ are the tracked full-stack assets we reuse.
COMPOSE_DIR := $(SRC_DIR)/../scripts/docker-compose
WORK_DIR    ?= /tmp/or-minimal
ENV_FILE    := $(SRC_DIR)/common.env
PROJECT_KEY ?= testkey0000000000001
# Compose file to act on (overridden by the *-bundle targets).
CF          ?= docker-compose.yaml
BUNDLE_IMAGE ?= openreplay-min-bundle:local
REPO_ROOT   := $(SRC_DIR)/..

COMPOSE = docker compose --env-file $(WORK_DIR)/common.env -f $(WORK_DIR)/$(CF)

.PHONY: up down seed logs ps check-env build-workdir help \
        build-image up-bundle down-bundle logs-bundle ps-bundle smoke _boot \
        capture e2e test-bundle


help: ## Prints help for targets with comments
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Minimal ingest stack

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
	cp "$(SRC_DIR)/docker-compose.bundle.yaml" "$(WORK_DIR)/docker-compose.bundle.yaml"
	cp "$(SRC_DIR)/Caddyfile" "$(WORK_DIR)/Caddyfile"
	cp -r "$(SRC_DIR)/bundle/testpage" "$(WORK_DIR)/testpage"
	cp -r "$(COMPOSE_DIR)/docker-envs" "$(COMPOSE_DIR)/migration-files" "$(WORK_DIR)/"
	cp "$(ENV_FILE)" "$(WORK_DIR)/common.env"
	# Expand $${COMMON_*} placeholders in each worker env file, as install.sh does.
	set -a; . "$(WORK_DIR)/common.env"; set +a
	ln -sf common.env "$(WORK_DIR)/.env"
	for f in "$(WORK_DIR)"/docker-envs/*.env; do \
		envsubst < "$$f" > "$$f.tmp" && mv "$$f.tmp" "$$f"; \
	done

up: build-workdir ## Build workdir, boot the six-container stack, seed a project
	@$(MAKE) --no-print-directory _boot CF=$(CF)

_boot:
	@set -Eeuo pipefail
	COMPOSE_PROFILES=migration $(COMPOSE) up -d
	echo "Waiting for Postgres schema (db-migration) ..."
	until COMPOSE_PROFILES=migration $(COMPOSE) ps -a db-migration --format '{{.State}}' 2>/dev/null | grep -q exited; do sleep 2; done
	$(MAKE) --no-print-directory seed CF=$(CF) || true
	set -a; . "$(WORK_DIR)/common.env"; set +a
	echo "Up. http ingest on host port $${HTTP_PORT:-8080} (tracker ingestPoint: caddy on $${INGEST_PORT:-8095})."

seed: ## Insert a default project so ingest works
	@set -Eeuo pipefail
	set -a; . "$(WORK_DIR)/common.env"; set +a
	echo "Seeding project_key=$(PROJECT_KEY) ..."
	$(COMPOSE) exec -T -e PGPASSWORD="$$COMMON_PG_PASSWORD" postgresql \
		psql -U postgres -tAc \
		"INSERT INTO projects (name, active, project_key) \
		 VALUES ('minimal-smoke', true, '$(PROJECT_KEY)') \
		 ON CONFLICT (project_key) DO NOTHING \
		 RETURNING project_id, project_key;"

down: ## Stop the stack and remove all volumes
	@COMPOSE_PROFILES=migration $(COMPOSE) down -v

logs: ## Tail logs from all services
	@$(COMPOSE) logs -f

ps: ## Show container status
	@$(COMPOSE) ps

##@ Single-container bundle (all six workers under s6-overlay)

build-image: ## Build the s6-overlay bundle image (all six workers)
	@set -Eeuo pipefail
	docker build -f "$(SRC_DIR)/bundle/Dockerfile" -t "$(BUNDLE_IMAGE)" "$(REPO_ROOT)"

up-bundle: build-image build-workdir ## Build image + boot the single supervised container, seed a project
	@$(MAKE) --no-print-directory _boot CF=docker-compose.bundle.yaml

down-bundle: ## Stop the bundle stack and remove all volumes
	@$(MAKE) --no-print-directory down CF=docker-compose.bundle.yaml

logs-bundle: ## Tail logs from the bundle stack (all workers prefixed by s6)
	@$(MAKE) --no-print-directory logs CF=docker-compose.bundle.yaml

ps-bundle: ## Show bundle container status
	@$(MAKE) --no-print-directory ps CF=docker-compose.bundle.yaml

smoke: ## Run the bundle smoke test against a booted bundle stack
	@set -Eeuo pipefail
	set -a; . "$(WORK_DIR)/common.env"; set +a
	OR_BUNDLE_NET=$$(basename "$(WORK_DIR)")_openreplay-net \
	  bash "$(SRC_DIR)/bundle/smoke.sh"

capture: ## Drive the real tracker with Playwright to record one session
	@bash "$(SRC_DIR)/bundle/e2e.sh"

e2e: ## End-to-end: record a session and prove it lands in object storage
	@$(MAKE) --no-print-directory capture

test-bundle: ## Full run: build + boot + e2e capture + smoke, then tear down
	@set -Eeuo pipefail
	$(MAKE) --no-print-directory up-bundle
	if $(MAKE) --no-print-directory e2e; then RESULT=PASS; else RESULT=FAIL; fi; \
	  echo ""; echo "======== BUNDLE TEST RESULT: $$RESULT ========"; \
	  $(MAKE) --no-print-directory down-bundle; \
	  [ "$$RESULT" = PASS ]
