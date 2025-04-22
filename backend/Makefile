ee ?= "false" # true to build ee
app ?= "" # app name, default all
arch ?= "amd64" # default amd64
docker_runtime ?= "docker"  # default docker runtime

.PHONY: help
help: ## Prints help for targets with comments
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Docker

.PHONY: build
build: ## Build the backend. ee=true for ee build. app=app name for only one app. Default build all apps.
	ARCH=$(arch) DOCKER_RUNTIME=$(docker_runtime) bash build.sh $(ee) $(app)

##@ Local Dev

.PHONY: scan
scan: ## Scan the backend
	@trivy fs -q .

.PHONY: update
update: ## Update the backend dependecies
	@echo Updating dependencies
	@go get -u -v ./...
	@go mod tidy

run: ## Run the backend. app=app name for app to run
	@if [ $(app) == "" ]; then echo "Error: app parameter is required. Usage: make run app=<app_name>"; exit 1; fi
	@go run "cmd/$(app)/main.go"
