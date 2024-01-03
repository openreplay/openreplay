#!/bin/bash

REPO_URL="https://github.com/openreplay/openreplay"

# Ask for the branch to clone (default is master/main)
read -rp "Enter the version to clone (default is 'main'): " REPO_BRANCH
REPO_BRANCH=${REPO_BRANCH:-main}

# Directory in which to clone the repository
CLONE_DIR="openreplay"

info() {
	echo -e "\033[0;32m[INFO] $1 \033[0m"
}

error() {
	echo -e "\033[0;31m[ERROR] $1 \033[0m"
	exit 1
}

# Check if git is installed
if ! command -v git &>/dev/null; then
	error "Git is not installed. Please install Git and run this script again."
fi

# Clone the repository
if git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$CLONE_DIR"; then
    info "Repository cloned successfully."
else
	error "Failed to clone the repository."
fi

# Navigate into the repository directory
cd "$CLONE_DIR/scripts/docker-compose" || error "The directory $CLONE_DIR does not exist."

# Path to the script to run
SCRIPT_PATH="./install.sh"

# Check if the script exists and is executable
if [[ -f "$SCRIPT_PATH" ]]; then
	bash "$SCRIPT_PATH"
else
	error "The script $SCRIPT_PATH does not exist or is not executable."
fi

# End of wrapper script
