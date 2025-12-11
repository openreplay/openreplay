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

    # Update domain name replacement
    sed -i "s/change_me_domain/${DOMAIN_NAME}/g" common.env

    # Find all change_me_ entries and replace them with random passwords
    grep -o 'change_me_[a-zA-Z0-9_]*' common.env | sort -u | while read -r token; do
        random_pass=$(randomPass)
        sed -i "s/${token}/${random_pass}/g" common.env
        info "Generated password for ${token}"
    done

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
echo "CADDY_DOMAIN=\"$DOMAIN_NAME\"" >>common.env

read -p "Is the domain on a public DNS? (y/n) " yn
case $yn in
y)
    echo "$DOMAIN_NAME is on a public DNS"
    ;;
n)
    echo "$DOMAIN_NAME is on a private DNS"
    #add TLS internal to caddyfile
    #In local network Caddy can't reach Let's Encrypt servers to get a certificate
    mv Caddyfile Caddyfile.public
    mv Caddyfile.private Caddyfile
    ;;
*)
    echo invalid response
    exit 1
    ;;
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
y)
    echo "$DOMAIN_NAME is on a public DNS"
    ##No changes needed
    ;;
n)
    echo "$DOMAIN_NAME is on a private DNS"
    ##Add a variable to chalice.env file
    echo "SKIP_H_SSL=True" >>chalice.env
    ;;
*)
    echo invalid response
    exit 1
    ;;
esac

readarray -t services < <(sudo -E docker-compose config --services)
for service in "${services[@]}"; do
    echo "Pulling image for $service..."
    sudo -E docker-compose pull --no-parallel "$service"
    sleep 5
done

sudo -E docker-compose --profile migration up --force-recreate --build -d
cp common.env common.env.bak
echo "🎉🎉🎉  Done! 🎉🎉🎉"

info "Installation complete!! open https://${DOMAIN_NAME} 🐳"
info "${PWD} have the docker-compose file. you can use docker-compose stop/start"
