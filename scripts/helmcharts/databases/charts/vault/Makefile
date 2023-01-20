TEST_IMAGE?=vault-helm-test
GOOGLE_CREDENTIALS?=vault-helm-test.json
CLOUDSDK_CORE_PROJECT?=vault-helm-dev-246514
# set to run a single test - e.g acceptance/server-ha-enterprise-dr.bats
ACCEPTANCE_TESTS?=acceptance

# filter bats unit tests to run.
UNIT_TESTS_FILTER?='.*'

# set to 'true' to run acceptance tests locally in a kind cluster
LOCAL_ACCEPTANCE_TESTS?=false

# kind cluster name
KIND_CLUSTER_NAME?=vault-helm

# kind k8s version
KIND_K8S_VERSION?=v1.25.0

# Generate json schema for chart values. See test/README.md for more details.
values-schema:
	helm schema-gen values.yaml > values.schema.json

test-image:
	@docker build --rm -t $(TEST_IMAGE) -f $(CURDIR)/test/docker/Test.dockerfile $(CURDIR)

test-unit:
	@docker run --rm -it -v ${PWD}:/helm-test $(TEST_IMAGE) bats -f $(UNIT_TESTS_FILTER) /helm-test/test/unit

test-bats: test-unit test-acceptance

test: test-image test-bats

# run acceptance tests on GKE
# set google project/credential vars above
test-acceptance:
ifeq ($(LOCAL_ACCEPTANCE_TESTS),true)
	make setup-kind acceptance
else
	@docker run -it -v ${PWD}:/helm-test \
	-e GOOGLE_CREDENTIALS=${GOOGLE_CREDENTIALS} \
	-e CLOUDSDK_CORE_PROJECT=${CLOUDSDK_CORE_PROJECT} \
	-e KUBECONFIG=/helm-test/.kube/config \
	-e VAULT_LICENSE_CI=${VAULT_LICENSE_CI} \
	-w /helm-test \
	$(TEST_IMAGE) \
	make acceptance
endif

# destroy GKE cluster using terraform
test-destroy:
	@docker run -it -v ${PWD}:/helm-test \
	-e GOOGLE_CREDENTIALS=${GOOGLE_CREDENTIALS} \
	-e CLOUDSDK_CORE_PROJECT=${CLOUDSDK_CORE_PROJECT} \
	-w /helm-test \
	$(TEST_IMAGE) \
	make destroy-cluster

# provision GKE cluster using terraform
test-provision:
	@docker run -it -v ${PWD}:/helm-test \
	-e GOOGLE_CREDENTIALS=${GOOGLE_CREDENTIALS} \
	-e CLOUDSDK_CORE_PROJECT=${CLOUDSDK_CORE_PROJECT} \
	-e KUBECONFIG=/helm-test/.kube/config \
	-w /helm-test \
	$(TEST_IMAGE) \
	make provision-cluster

# this target is for running the acceptance tests
# it is run in the docker container above when the test-acceptance target is invoked
acceptance:
ifneq ($(LOCAL_ACCEPTANCE_TESTS),true)
	gcloud auth activate-service-account --key-file=${GOOGLE_CREDENTIALS}
endif
	bats --tap --timing test/${ACCEPTANCE_TESTS}

# this target is for provisioning the GKE cluster
# it is run in the docker container above when the test-provision target is invoked
provision-cluster:
	gcloud auth activate-service-account --key-file=${GOOGLE_CREDENTIALS}
	terraform init test/terraform
	terraform apply -var project=${CLOUDSDK_CORE_PROJECT} -var init_cli=true -auto-approve test/terraform

# this target is for removing the GKE cluster
# it is run in the docker container above when the test-destroy target is invoked
destroy-cluster:
	terraform destroy -auto-approve

# create a kind cluster for running the acceptance tests locally
setup-kind:
	kind get clusters | grep -q "^${KIND_CLUSTER_NAME}$$" || \
	kind create cluster \
	--image kindest/node:${KIND_K8S_VERSION} \
	--name ${KIND_CLUSTER_NAME}  \
	--config $(CURDIR)/test/kind/config.yaml
	kubectl config use-context kind-${KIND_CLUSTER_NAME}

# delete the kind cluster
delete-kind:
	kind delete cluster --name ${KIND_CLUSTER_NAME} || :

.PHONY: values-schema test-image test-unit test-bats test test-acceptance test-destroy test-provision acceptance provision-cluster destroy-cluster
