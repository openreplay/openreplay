.PHONY: help doc

help: ## This help.
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST) | sort

init: ## Prepare the host sytem for development
	pip install -r requirements.txt
	@echo "\033[95m\n\nYou may now run 'make check'.\n\033[0m"

check: ## Run tests
	pytest -vvv --exitfirst --capture=no tests.py
	bandit --skip=B101 -r .

check-fast: ## Run tests, fail fast
	pytest -x -vvv --capture=no tests.py

check-coverage: ## Code coverage
	pytest --quiet --cov-report=term --cov-report=html --cov=. tests.py

lint: ## Lint the code
	pylama .

doc: ## Build the documentation
	cd doc && make html
	@echo "\033[95m\n\nBuild successful! View the docs homepage at doc/build/html/index.html.\n\032[0m"

clean: ## Clean up
	git clean -fX

todo: ## Things that should be done
	@grep -nR --color=always --before-context=2 --after-context=2 TODO .

xxx: ## Things that require attention
	@grep -nR --color=always --before-context=2 --after-context=2 XXX .

serve: ## Run the server
	uvicorn --lifespan on --log-level warning --reload orpy:orpy

lock: ## Lock dependencies
	pip-compile -o requirements.txt requirements.source.txt

wip: ## clean up code, and commit wip
	black orpy.py
	isort --profile black orpy.py
	git add .
	git commit -m "wip"
