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
	type "$1" &>/dev/null
}

# Generate a random password using openssl
randomPass() {
	exists openssl || {
		info "Installing openssl... 🔐"
		sudo apt update &>/dev/null
		sudo apt install openssl -y &>/dev/null
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

read -p "Is the domain on a public DNS? (y/n) " yn
case $yn in 
	y ) echo "$DOMAIN_NAME is on a public DNS";
        ;;
	n ) echo "$DOMAIN_NAME is on a private DNS";
		# Maybe rename the docker-compose ?
		# And add build image to the new docker-compose

    # The docker-compose.private.yaml is the same as the docker-compose.yaml but with the chalice image changed to a local build image
    # It's because we disable the verify in health.py

		mv docker-compose.yaml docker-compose.public.yaml
		mv docker-compose.private.yaml docker-compose.yaml

    mv Caddyfile Caddyfile.public
		mv Caddyfile.private Caddyfile
		# this will change the calice image to a local build image
		# Or change verify=False in health
		sed -i 's/verify=True/verify=False/' ../../api/chalicelib/core/health.py
    #enterprise edition
    sed -i 's/verify=True/verify=False/' ../../ee/api/chalicelib/core/health.py
		;;
	* ) echo invalid response;
		exit 1;;
esac

# Create passwords if they don't exist
create_passwords

info "Starting the application with Docker... 🐳"
# Load variables from common.env into the current shell's environment
set -a # automatically export all variables
source common.env
set +a

# Use the `envsubst` command to substitute the shell environment variables into reference_var.env and output to a combined .env
case $yn in 
	y ) echo "$DOMAIN_NAME is on a public DNS";
    find ./ -type f \( -iname "*.env" -o -iname "docker-compose.yaml" \) ! -name "common.env" -exec /bin/bash -c 'file="{}"; git checkout -- "$file"; cp "$file" "$file.bak"; envsubst < "$file.bak" > "$file"; rm "$file.bak"' \;
    ;;
	n ) echo "$DOMAIN_NAME is on a private DNS";
    find ./ -type f -iname "*.env" ! -name "common.env" -exec /bin/bash -c 'file="{}"; git checkout -- "$file"; cp "$file" "$file.bak"; envsubst < "$file.bak" > "$file"; rm "$file.bak"' \;
    find ./ -type f -iname "docker-compose.yaml" -exec /bin/bash -c 'file="{}"; git checkout -- docker-compose.private.yaml; cp "$file" "$file.bak"; envsubst < "$file.bak" > "$file"; rm "$file.bak"' \;
		;;
	* ) echo invalid response;
		exit 1;;
esac
sudo -E docker-compose --parallel 5 pull
sudo -E docker-compose --profile migration up --force-recreate --build -d
cp common.env common.env.bak
echo "🎉🎉🎉  Done! 🎉🎉🎉"

info "Installation complete!! open https://${DOMAIN_NAME} 🐳"
info "${PWD} have the docker-compose file. you can use docker-compose stop/start"
