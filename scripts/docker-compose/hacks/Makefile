.PHONY: default
default: create-compose

help: ## Prints help for targets with comments
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ \
		{ printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: helm-template
helm-template:
	@rm -rf yamls
	@mkdir yamls
	@helm template op ../../helmcharts/openreplay -n app -f ../../helmcharts/vars.yaml -f vars.yaml > yamls/deployment.yaml 

.PHONY: create-yamls
create-yamls: helm-template
	@awk -v RS='---' 'NR>1{kind=""; name=""; if(match($$0, /kind:[[:space:]]*([a-zA-Z]+)/, k) &&  \
				match($$0, /name:[[:space:]]*([a-zA-Z0-9_.-]+)/, n)) \
				{kind=k[1]; name=n[1]; if(kind == "Deployment" || (kind == "Secret" && name == "or-secrets")) print $$0 > "yamls/"name".yaml";}}' yamls/deployment.yaml
	@rm yamls/deployment.yaml
	@bash process-secrets.sh

.PHONY: extract-versions
extract-versions: create-yamls ## Extract per-service image versions from helm yamls into common.env
	@echo "Extracting service versions..."
	@for f in yamls/*-openreplay.yaml; do \
		svc=$$(basename $$f -openreplay.yaml); \
		ver=$$(grep -oP 'image:\s*"[^:]+:\K[^"]+' $$f 2>/dev/null || true); \
		if [ -n "$$ver" ]; then \
			key=$$(echo $$svc | tr '[:lower:]' '[:upper:]')_VERSION; \
			if grep -q "^$$key=" ../common.env; then \
				sed -i "s|^$$key=.*|$$key=$$ver|" ../common.env; \
			else \
				sed -i "/^## Service image versions/a $$key=$$ver" ../common.env; \
			fi; \
			echo "  $$key=$$ver"; \
		fi; \
	done

.PHONY: create-envs
create-envs: extract-versions ## Create envs from deployment
	@echo Creating env vars...
	@rm -rf ../docker-envs
	@mkdir ../docker-envs
	@# @find ./ -type f -iname "Deployment" -exec templater -i env.tpl -f ../deployment.yaml {} > {}.env \;
	@find yamls/ -type f -name "*-openreplay.yaml" -exec sh -c 'filename=$$(basename {} -openreplay.yaml); \
				templater -i tpls/env.tpl -f {} > ../docker-envs/$${filename}.env' \;
	@# Replace all http/https for COMMON_DOMAIN_NAME with COMMON_PROTOCOL
	@find ../docker-envs/ -type f -name "*.env" -exec sed -i 's|http[s]\?://\$${COMMON_DOMAIN_NAME}|\$${COMMON_PROTOCOL}://\$${COMMON_DOMAIN_NAME}|g' {} \;

.PHONY: copy-migration-files
copy-migration-files: ## Copy migration files for bind mounts
	@mkdir -p ../migration-files
	@cp ../../helmcharts/openreplay/files/minio.sh ../migration-files/minio.sh
	@cp ../../schema/db/init_dbs/postgresql/init_schema.sql ../migration-files/init_pg_schema.sql
	@cp ../../schema/db/init_dbs/clickhouse/create/init_schema.sql ../migration-files/init_ch_schema.sql

.PHONY: create-compose
create-compose: create-envs copy-migration-files ## Create docker-compose.yml
	@echo creating docker-compose yaml
	$(eval FILES := $(shell find yamls/ -type f -name "*-openreplay.yaml" -exec basename {} .yaml \; | tr '\n' ',' | sed 's/,$$//'))
	@#echo "Files found: $(FILES)"
	@FILES=$(FILES) templater -i tpls/docker-compose.tpl -f ../../helmcharts/vars.yaml -f vars.yaml > ../docker-compose.yaml
