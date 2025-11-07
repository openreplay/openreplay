help: ## Prints help for targets with comments
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

builder ?= podman ## builder
repo ?= local
image ?= $(repo)/redis:7

build: ## build image
	$(builder) build -t $(image) .

push: build ## push image
	$(builder) push $(image)

dev: build ## build run image
	podman run -it --rm --network host $(image)

test: build ## test redis image
	podman run -d --name redis-test -p 6379:6379 $(image)
	@echo "Waiting for Redis to start..."
	@sleep 2
	@echo "Testing Redis connection..."
	podman exec redis-test redis-cli ping
	@echo "Setting test key..."
	podman exec redis-test redis-cli set testkey "Hello Redis"
	@echo "Getting test key..."
	podman exec redis-test redis-cli get testkey
	@echo "Redis info:"
	podman exec redis-test redis-cli info server | grep redis_version
	@echo "Cleaning up..."
	podman stop redis-test
	podman rm redis-test

test-env: build ## test redis with custom environment variables
	@echo "Testing with custom port (6380)..."
	podman run -d --name redis-test-port -p 6380:6380 \
		-e REDIS_PORT=6380 \
		-e REDIS_REPLICATION_MODE=master \
		-e ALLOW_EMPTY_PASSWORD=yes \
		$(image)
	@sleep 2
	podman exec redis-test-port redis-cli -p 6380 ping
	podman stop redis-test-port && podman rm redis-test-port
	@echo "\nTesting with password authentication..."
	podman run -d --name redis-test-auth -p 6379:6379 \
		-e ALLOW_EMPTY_PASSWORD=no \
		-e REDIS_PASSWORD=testpass123 \
		$(image)
	@sleep 2
	podman exec redis-test-auth redis-cli -a testpass123 ping
	podman stop redis-test-auth && podman rm redis-test-auth
	@echo "\nAll environment variable tests passed!"

kube: build
	podman push $(image)
