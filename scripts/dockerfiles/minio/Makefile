help: ## Prints help for targets with comments
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

builder ?= podman ## builder
repo ?= local
image ?= $(repo)/minio:2025

build: ## build image
	$(builder) build -t $(image) .

push: build ## push image
	$(builder) push $(image)

test: build ## test image with mc client
	@echo "Starting MinIO server..."
	@$(builder) run -d --name minio-test -p 9000:9000 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin123 $(image)
	@sleep 3
	@echo "Testing mc command..."
	@$(builder) exec minio-test mc alias set local http://localhost:9000 minioadmin minioadmin123
	@$(builder) exec minio-test mc mb local/test-bucket
	@$(builder) exec minio-test mc ls local/
	@echo "Creating and uploading test file..."
	@$(builder) exec minio-test sh -c "echo 'test content' > /tmp/test.txt && mc cp /tmp/test.txt local/test-bucket/"
	@$(builder) exec minio-test mc ls local/test-bucket/
	@echo "Verifying user permissions..."
	@$(builder) exec minio-test id
	@echo "Cleaning up..."
	@$(builder) stop minio-test
	@$(builder) rm minio-test
	@echo "✅ All tests passed!"

dev: build ## build run image
	podman run -it --rm --network host $(image)

kube: build
	podman push $(image)
