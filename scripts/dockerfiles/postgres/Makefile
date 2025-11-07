help: ## Prints help for targets with comments
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

builder ?= podman ## builder
repo ?= local
image ?= $(repo)/postgresql:17

build: ## build image
	$(builder) build -t $(image) .

push: build ## push image
	$(builder) push $(image)

dev: build ## build and run image
	podman run -it --rm --network host \
		-e POSTGRES_PASSWORD=postgres123 \
		-v postgresql-data:/bitnami/postgresql \
		$(image)

test: build ## build and test image
	@echo "Starting PostgreSQL container for testing..."
	@podman stop postgres-test 2>/dev/null || true
	@podman rm postgres-test 2>/dev/null || true
	@podman run -d --name postgres-test \
		-p 5432:5432 \
		-e POSTGRES_PASSWORD=postgres123 \
		$(image)
	@echo "Waiting for PostgreSQL to initialize..."
	@sleep 10
	@echo "Running tests..."
	@./test_postgres.sh
	@echo ""
	@echo "Running database operations test..."
	@./create_test_object.sh
	@echo ""
	@echo "Running extensions test..."
	@./test_extensions.sh
	@echo ""
	@echo "Cleaning up test container..."
	@podman stop postgres-test
	@podman rm postgres-test
	@echo "✅ All tests completed successfully!"

kube: build
	podman push $(image)
