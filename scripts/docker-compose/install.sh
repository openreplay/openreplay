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
# Check if Docker is already installed
if ! command -v docker &> /dev/null; then
	info "Setting up Docker"
	sudo apt install docker.io -y

	# enable docker without sudo
	sudo usermod -aG docker "${USER}" || true
else
	echo "Docker is already installed. Skipping Docker installation."
fi

# Check if Docker Compose is already installed
if ! command -v docker-compose &>/dev/null && ! command -v docker compose &>/dev/null; then
	info "Setting up Docker Compose"
	sudo apt install docker-compose -y
else
	echo "Docker Compose is already installed. Skipping Docker Compose installation."
fi

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
echo "CADDY_DOMAIN=\"$DOMAIN_NAME\"" >> common.env 

read -p "Is the domain on a public DNS? (y/n) " yn
case $yn in 
	y ) echo "$DOMAIN_NAME is on a public DNS";
        ;;
	n ) echo "$DOMAIN_NAME is on a private DNS";
		#add TLS internal to caddyfile
		#In local network Caddy can't reach Let's Encrypt servers to get a certificate 
		mv Caddyfile Caddyfile.public
		mv Caddyfile.private Caddyfile
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
find ./ -type f \( -iname "*.env" -o -iname "docker-compose.yaml" \) ! -name "common.env" -exec /bin/bash -c 'file="{}"; git checkout -- "$file"; cp "$file" "$file.bak"; envsubst < "$file.bak" > "$file"; rm "$file.bak"' \;

case $yn in 
	y ) echo "$DOMAIN_NAME is on a public DNS";
		##No changes needed
        ;;
	n ) echo "$DOMAIN_NAME is on a private DNS";
		##Add a variable to chalice.env file
		echo "SKIP_H_SSL=True" >> chalice.env
		;;
	* ) echo invalid response;
		exit 1;;
esac

if command -v docker-compose >/dev/null 2>&1; then
	# Docker Compose V1 is installed.
	sudo -E docker-compose --parallel 1 pull
	sudo -E docker-compose --profile migration up --force-recreate --build -d
else
	# Docker Compose V2 or higher is installed.
	sudo -E docker compose --parallel 1 pull
	sudo -E docker compose --profile migration up --force-recreate --build -d
fi

cp common.env common.env.bak
echo "🎉🎉🎉  Done! 🎉🎉🎉"

info "Installation complete!! open https://${DOMAIN_NAME} 🐳"
info "${PWD} have the docker-compose file. you can use docker-compose stop/start"
