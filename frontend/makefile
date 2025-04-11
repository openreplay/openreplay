# Variables
YARN := $(shell which yarn)
LOGS_DIR := logs
ENV_FILE := .env

# Create logs directory if it doesn't exist
$(shell mkdir -p $(LOGS_DIR))

# Function to read a variable from .env file, with default value
define read_env
$(shell if [ -f $(ENV_FILE) ]; then \
    grep -E "^$(1)=" $(ENV_FILE) 2>/dev/null | \
    sed -E 's/^$(1)=//;s/^"//;s/"$$//;s/^'\''//;s/'\''$$//' | \
    head -n 1; \
else \
    echo "$(2)"; \
fi)
endef

# Read environment variables from .env file
NODE_ENV := $(call read_env,NODE_ENV,development)
API_EDP := $(call read_env,API_EDP,http://localhost:3000)

# Default target
.PHONY: all
all: start

# Target to start the frontend app
.PHONY: start
start:
	@if [ -z "$(YARN)" ]; then \
		echo "Error: yarn command not found. Please install yarn."; \
		exit 1; \
	fi
	@if pgrep -f "$(YARN) start" > /dev/null; then \
		echo "Frontend app is already running"; \
		echo "Running processes:"; \
		ps -ef | grep "$(YARN) start" | grep -v grep; \
	else \
		echo "Starting frontend app with NODE_ENV=$(NODE_ENV) and API_EDP=$(API_EDP)"; \
		mkdir -p $(LOGS_DIR); \
		LOG_FILE=$(LOGS_DIR)/frontend-$(shell date +%Y%m%d%H%M%S).log; \
		NODE_ENV=$(NODE_ENV) API_EDP=$(API_EDP) $(YARN) start > $$LOG_FILE 2>&1 & \
		echo "Frontend app started with PID: $$!"; \
		echo "Logs are available in $$LOG_FILE"; \
	fi

# Target to start the frontend app in foreground with visible logs
.PHONY: start-fg
start-fg:
	@if [ -z "$(YARN)" ]; then \
		echo "Error: yarn command not found. Please install yarn."; \
		exit 1; \
	fi
	@if pgrep -f "$(YARN) start" > /dev/null; then \
		echo "Frontend app is already running"; \
		echo "Running processes:"; \
		ps -ef | grep "$(YARN) start" | grep -v grep; \
	else \
		echo "Starting frontend app with NODE_ENV=$(NODE_ENV) and API_EDP=$(API_EDP)"; \
		mkdir -p $(LOGS_DIR); \
		LOG_FILE=$(LOGS_DIR)/frontend-$(shell date +%Y%m%d%H%M%S).log; \
		NODE_ENV=$(NODE_ENV) API_EDP=$(API_EDP) $(YARN) start 2>&1 | tee $$LOG_FILE; \
	fi

# Target to stop the frontend app
.PHONY: stop
stop:
	@if pgrep -f "yarn" > /dev/null; then \
		echo "Stopping all yarn processes..."; \
		pkill -f "yarn"; \
		echo "All yarn processes have been stopped."; \
	else \
		echo "No yarn processes are currently running."; \
	fi

# Target to show status of the frontend app
.PHONY: status
status:
	@if pgrep -f "$(YARN) start" > /dev/null; then \
		echo "Frontend app is running"; \
		echo "Running processes:"; \
		ps -ef | grep "$(YARN) start" | grep -v grep; \
	else \
		echo "Frontend app is not running"; \
	fi

# Target to show logs
.PHONY: logs
logs:
	@if [ -d "$(LOGS_DIR)" ] && [ "$$(ls -A $(LOGS_DIR) 2>/dev/null)" ]; then \
		echo "Available log files:"; \
		ls -la $(LOGS_DIR); \
		echo ""; \
		echo "To view a specific log file, use: cat $(LOGS_DIR)/<log_file>"; \
	else \
		echo "No log files found in $(LOGS_DIR)"; \
	fi

# Target to deploy to production with environment validation
.PHONY: prod-deploy
prod-deploy:
	@if [ ! -f .env.production ]; then \
		echo "Error: .env.production file not found. Please create it for production deployment."; \
		exit 1; \
	fi
	@echo "Deploying to production using .env.production"
	@NODE_ENV=$$(grep -E "^NODE_ENV=" .env.production | sed -E 's/^NODE_ENV=//;s/^"//;s/"$$//;s/^'\''//;s/'\''$$//' | head -n 1); \
	if [ -z "$$NODE_ENV" ]; then NODE_ENV=production; fi; \
	API_EDP=$$(grep -E "^API_EDP=" .env.production | sed -E 's/^API_EDP=//;s/^"//;s/"$$//;s/^'\''//;s/'\''$$//' | head -n 1); \
	if [ -z "$$API_EDP" ]; then API_EDP=https://api.openreplay.com; fi; \
	echo "Deploying to production with NODE_ENV=$$NODE_ENV and API_EDP=$$API_EDP"; \
	mkdir -p $(LOGS_DIR); \
	LOG_FILE=$(LOGS_DIR)/production-deploy-$$(date +%Y%m%d%H%M%S).log; \
	yes y | NODE_ENV=$$NODE_ENV API_EDP=$$API_EDP $(YARN) deploy:production 2>&1 | tee $$LOG_FILE;

# Target to show help
.PHONY: help
help:
	@echo "Available targets:"
	@echo " make - Starts the frontend app in the background"
	@echo " make start - Starts the frontend app in the background"
	@echo " make start-fg - Starts the frontend app in the foreground with visible logs"
	@echo " make stop - Stops all yarn processes"
	@echo " make status - Shows the current status of the frontend app"
	@echo " make logs - Shows available log files"
	@echo " make prod-deploy - Deploys to production with NODE_ENV and API_EDP from .env.production"
	@echo " make help - Shows this help message"

