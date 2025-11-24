help: ## Prints help for targets with comments
	@cat $(MAKEFILE_LIST) | grep -E '^[a-zA-Z_-]+:.*?## .*$$' | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

domain ?= $(shell echo $${DOMAIN:-})
override_file ?= "/home/ubuntu/vars_override.yaml"
shell := /bin/bash -eo pipefail
version ?= $(shell yq e '.appVersion' openreplay/Chart.yaml || "")

download-cli: ## Download the latest version of the application
	sudo wget https://raw.githubusercontent.com/openreplay/openreplay/$(version)/scripts/helmcharts/openreplay-cli -O /bin/openreplay ; sudo chmod +x /bin/openreplay

clean: ## Clean up the installation
	sudo rm /var/lib/openreplay/vars.yaml
	kubectl delete cm openreplay-version -n app || true
	helm uninstall openreplay -n app || true
	helm uninstall databases -n db || true
	kubectl delete pvc -n db --all || true

install: ## Install the application
	OR_VERSION=$(version) OVERRIDE_FILE=$(override_file) openreplay -i $(domain)

upgrade-release: ## upgrade the application
	OR_VERSION=$(version) RELEASE_UPGRADE=1 openreplay -u

pull: ## Pull the latest version of the application
	for image in $(shell kubectl get pods -n app -o jsonpath='{.items[*].spec.containers[*].image}'); do \
		sudo crictl pull $$image; \
	done

restart: ## Restart the application
	kubectl rollout restart deployment -n app
