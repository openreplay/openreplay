.PHONY: help doc

help: ## This help.
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST) | sort

init: ## Prepare the host sytem for development
	pip install -r requirements.txt -r requirements.dev.txt
	@echo "\033[95m\n\nYou may now run 'make check'.\n\033[0m"

postgresql-init: ## Initialize postgresql with defaults credentials
	sudo -u postgres createdb orpy
	echo 'grant all privileges on database orpy to orpy ;' | sudo -u postgres psql
	echo orpy | psql -h localhost -U orpy -W < postgresql-init.sql

postgresql-clear: ## Clear postgresql with defaults credentials
	echo 'DROP DATABASE orpy' | sudo -u postgres psql 

check: ## Run tests
	pytest -vvv --exitfirst --capture=no orpy/*.py
	bandit --skip=B101 -r .

check-fast: ## Run tests, fail fast
	pytest -x -vvv --capture=no orpy/*.py

check-coverage: ## Code coverage
	pytest --quiet --cov-report=term --cov-report=html --cov=. orpy/*.py

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
	ORPY_DEBUG=1 uvicorn --lifespan on --log-level debug --reload orpy:orpy

lock: ## Lock dependencies
	pip-compile -o requirements.txt requirements.source.txt

wip: ## clean up code, and commit wip
	black orpy/
	isort --profile black orpy/
	git add .
	git commit -m "wip"
