help: ## Prints help for targets with comments
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

create-yamls: ## Create yamls from deployment
	# @cat ../deployment.yaml | awk -v RS='---' 'NR>1{kind=""; name=""; if(match($0, /kind:[[:space:]]*([a-zA-Z]+)/, k) && match($0, /name:[[:space:]]*([a-zA-Z0-9_.-]+)/, n)) {kind=k[1]; name=n[1]; print $0 > kind"-"name".yaml";}}'
	# Only deployments
	@cat ../deployment.yaml | awk -v RS='---' 'NR>1{kind=""; name=""; if(match($0, /kind:[[:space:]]*([a-zA-Z]+)/, k) && match($0, /name:[[:space:]]*([a-zA-Z0-9_.-]+)/, n)) {kind=k[1]; name=n[1]; if(kind == "Deployment") print $0 > kind"-"name".yaml";}}'
