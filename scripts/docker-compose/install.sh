#!/bin/bash

# Interactive Bash Script with Emojis

set -e

# Color codes for pretty printing
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# --- Helper functions for logs ---
info() {
    echo -e "${GREEN}[INFO] $1 ${NC} 👍"
}

warn() {
    echo -e "${YELLOW}[WARN] $1 ${NC} ⚠️"
}

fatal() {
    echo -e "${RED}[FATAL] $1 ${NC} 🔥"
    exit 1
}

# Function to check if a command exists
function exists() {
  type "$1" &> /dev/null 
}

# Generate a random password using openssl
randomPass() {
    exists openssl || {
      info "Installing openssl... 🔐"
      sudo apt update &> /dev/null
      sudo apt install openssl -y &> /dev/null
    }
    openssl rand -hex 10
}

# Create dynamic passwords and update the environment file
function create_passwords() {
  info "Creating dynamic passwords..."
  sed -i "s/change_me_domain/${DOMAIN_NAME}/g" common.env
  sed -i "s/change_me_jwt/$(randomPass)/g" common.env
  sed -i "s/change_me_s3_key/$(randomPass)/g" common.env
  sed -i "s/change_me_s3_secret/$(randomPass)/g" common.env
  sed -i "s/change_me_pg_password/$(randomPass)/g" common.env
  info "Passwords created and updated in common.env file."
}

# update apt cache
info "Grabbing latest apt caches"
sudo apt update

# setup docker
info "Setting up Docker"
sudo apt install docker.io docker-compose -y

# enable docker without sudo
sudo usermod -aG docker "${USER}" || true

# Prompt for DOMAIN_NAME input
echo -e "${GREEN}Please provide your domain name.${NC}"
echo "Let's get the exact domain OpenReplay will be installed on"
echo "Make sure that you have a Host A DNS record pointing to this instance!"
echo "This will be used for TLS 🔐"
echo -e "ie: my-openreplay.company.com (NOT an IP address)\n"

echo -e "${GREEN}"
read -rp "Enter DOMAIN_NAME: " DOMAIN_NAME
echo -e "${NC}"
if [[ -z $DOMAIN_NAME ]]; then
    fatal "DOMAIN_NAME variable is empty. Please provide a valid domain name to proceed."
fi
info "Using domain name: $DOMAIN_NAME 🌐"

# Create passwords if they don't exist
create_passwords

info "Starting the application with Docker... 🐳"
# Load variables from common.env into the current shell's environment
set -a  # automatically export all variables
source common.env
set +a

# Use the `envsubst` command to substitute the shell environment variables into reference_var.env and output to a combined .env
find ./ -type f \( -iname "*.env" -o -iname "docker-compose.yaml" \) ! -name "common.env" -exec /bin/bash -c 'file="{}"; git checkout -- "$file"; cp "$file" "$file.bak"; envsubst < "$file.bak" > "$file"; rm "$file.bak"' \;
sudo -E docker-compose pull --no-parallel
sudo -E docker-compose up -d
echo "🎉🎉🎉  Done! 🎉🎉🎉"

cp -rf ../docker-compose ~/openreplay-docker-compose
rm -rf "$(git rev-parse --show-toplevel)"
info "Installation complete!! open https://${DOMAIN_NAME} 🐳"
info "${HOME}/openreplay-docker-compose have the docker-compose file. you can use docker-compose stop/start"
