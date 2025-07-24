help: ## Prints help for targets with comments
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

docker ?= docker
docker_registry ?=
docker_arch ?= linux/arm64

docker-build: ## Build the Docker image
	$(docker) build --platform $(docker_arch) -t $(docker_registry)/replay_exporter . && $(docker) push ${docker_registry)/replay_exporter
