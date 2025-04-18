ee ?= "false" # true to build ee
arch ?= "amd64" # default amd64
docker_runtime ?= "docker"  # default docker runtime
docker_repo ?= "public.ecr.aws/p1t3u8a3"
docker_build_args ?= $(if $(filter depot,$(docker_runtime)),"--push","")

.PHONY: help
help: ## Prints help for targets with comments
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Docker

.PHONY: build
build: ## Build the backend. ee=true for ee build.
	@DOCKER_BUILD_ARGS=$(docker_build_args) DOCKER_REPO=$(docker_repo) ARCH=$(arch) DOCKER_RUNTIME=$(docker_runtime) bash build.sh $(ee)

##@ Local Dev

.PHONY: scan
scan: ## Scan the backend
	@echo scanning foss
	@trivy fs -q .
	@echo scanning ee
	@trivy fs -q ../ee/assist-server/
