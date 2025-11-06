help: ## Prints help for targets with comments
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

builder ?= podman ## builder
repo ?= local
image ?= $(repo)/minio:2025

build: ## build image
	$(builder) build -t $(image) .

push: build ## push image
	$(builder) push $(image)

dev: build ## build run image
	podman run -it --rm --network host $(image)

kube: build
	podman push $(image)
