help: ## Prints help for targets with comments
	@cat $(MAKEFILE_LIST) | grep -E '^[a-zA-Z_-]+:.*?## .*$$' | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

domain ?= $(shell echo $${DOMAIN:-})
version ?= $(shell echo $${OR_VERSION:-})
override_file ?= "/home/ubuntu/vars_override.yaml"
shell := /bin/bash -eo pipefail

clean: ## Clean up the installation
	helm uninstall openreplay -n app || true
	helm uninstall databases -n db || true
	kubectl delete pvc -n db --all || true

install: ## Install the application
	OR_VERSION=$(version) OVERRIDE_FILE=$(override_file) openreplay -i $(domain)
