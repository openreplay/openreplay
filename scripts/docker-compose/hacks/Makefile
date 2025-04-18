.PHONY: default
default: create-envs

help: ## Prints help for targets with comments
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ \
		{ printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: helm-template
helm-template:
	@rm -rf yamls
	@mkdir yamls
	@helm template op ../../helmcharts/openreplay -f ../../helmcharts/vars.yaml -f vars.yaml > yamls/deployment.yaml 

.PHONY: create-yamls
create-yamls: helm-template
	@awk -v RS='---' 'NR>1{kind=""; name=""; if(match($$0, /kind:[[:space:]]*([a-zA-Z]+)/, k) &&  \
				match($$0, /name:[[:space:]]*([a-zA-Z0-9_.-]+)/, n)) \
				{kind=k[1]; name=n[1]; if(kind == "Deployment") print $$0 > "yamls/"name".yaml";}}' yamls/deployment.yaml
	@rm yamls/ingress-nginx.yaml
	@rm yamls/deployment.yaml

.PHONY: create-envs
create-envs: create-yamls ## Create envs from deployment
	@echo Creating env vars...
	@rm -rf envs
	@mkdir envs
	@# @find ./ -type f -iname "Deployment" -exec templater -i env.tpl -f ../deployment.yaml {} > {}.env \;
	@find yamls/ -type f -name "*.yaml" -exec sh -c 'filename=$$(basename {} -openreplay.yaml); \
				templater -i tpls/env.tpl -f {} > envs/$${filename}.env' \;
	@# Replace all http/https for COMMON_DOMAIN_NAME with COMMON_PROTOCOL
	@find envs/ -type f -name "*.env" -exec sed -i 's|http[s]\?://\$${COMMON_DOMAIN_NAME}|\$${COMMON_PROTOCOL}://\$${COMMON_DOMAIN_NAME}|g' {} \;
