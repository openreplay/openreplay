.DEFAULT_GOAL := help

# Customizable variables
# Override with: make build repo=myrepo name=postgres version=18
builder ?= podman
repo ?= local
name ?= postgresql
version ?= 17
image ?= $(repo)/$(name):$(version)

.PHONY: help
help: ## Show this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: build
build: ## Build PostgreSQL image
	$(builder) build -t $(image) .

.PHONY: push
push: build ## Build and push image to registry
	$(builder) push $(image)

.PHONY: dev
dev: build ## Build and run image interactively
	$(builder) run -it --rm --network host \
		-e POSTGRES_PASSWORD=postgres123 \
		-v postgresql-data:/bitnami/postgresql \
		$(image)

.PHONY: test
test: build ## Build and run full test suite
	@echo "Testing image: $(image)"
	@echo "Starting PostgreSQL container for testing..."
	@$(builder) stop postgres-test 2>/dev/null || true
	@$(builder) rm postgres-test 2>/dev/null || true
	@$(builder) run -d --name postgres-test \
		-p 5432:5432 \
		-e POSTGRES_PASSWORD=postgres123 \
		$(image)
	@echo "Waiting for PostgreSQL to initialize..."
	@sleep 15
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
	@$(builder) stop postgres-test
	@$(builder) rm postgres-test
	@echo "✅ All tests completed successfully!"

.PHONY: clean
clean: ## Remove test containers and images
	@$(builder) stop postgres-test 2>/dev/null || true
	@$(builder) rm postgres-test 2>/dev/null || true
	@$(builder) rmi $(image) 2>/dev/null || true
	@echo "Cleaned up test resources"

.PHONY: kube
kube: build ## Build and push image for Kubernetes
	$(builder) push $(image)
