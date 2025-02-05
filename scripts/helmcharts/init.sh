#!/bin/bash
set -ex

# Ref: https://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BWHITE='\033[1;37m'
NC='\033[0m' # No Color
# --- helper functions for logs ---
info() { echo -e "${GREEN}[INFO] $*${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $*${NC}"; }
fatal() {
    echo -e "${RED}[FATAL] $*${NC}"
    exit 1
}

export PATH=/var/lib/openreplay:$PATH

usr=$(whoami)

# Installing k3s
function install_k8s() {
    echo "nameserver 1.1.1.1" | sudo tee /etc/k3s-resolv.conf
    curl -sL https://get.k3s.io | sudo K3S_KUBECONFIG_MODE="644" INSTALL_K3S_VERSION='v1.31.5+k3s1' INSTALL_K3S_EXEC="--disable=traefik server --resolv-conf=/etc/k3s-resolv.conf" sh -
    [[ -d ~/.kube ]] || mkdir ~/.kube
    sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
    sudo chmod 0644 ~/.kube/config
    sudo chown -R $usr ~/.kube/config
    sleep 10
}

# Checking whether the app exists or we do have to upgade.
function exists() {
    install_status=Upgrading
    [[ $UPGRADE_TOOLS -eq 1 ]] && {
        install_status=Upgrading
        return 100
    }
    which $1 &>/dev/null
    return $?
}

## Prepping the infra

# Mac os doesn't have gnu sed, which will cause compatibility issues.
# This wrapper will help to check the sed, and use the correct version="v1.22.0"
# Ref: https://stackoverflow.com/questions/37639496/how-can-i-check-the-version="v1.22.0"
function is_gnu_sed() {
    sed --version >/dev/null 2>&1
}

function sed_i_wrapper() {
    if is_gnu_sed; then
        $(which sed) "$@"
    else
        a=()
        for b in "$@"; do
            [[ $b == '-i' ]] && a=("${a[@]}" "$b" "") || a=("${a[@]}" "$b")
        done
        $(which sed) "${a[@]}"
    fi
}

# Create dynamic passwords and update domain
create_passwords() {
    local domain_name=${DOMAIN_NAME:-$(yq e '.domainName' vars.yaml)}
    if [[ -z $domain_name ]]; then
        fatal 'DOMAIN_NAME variable is empty. Rerun the script with `DOMAIN_NAME=openreplay.mycomp.org bash init.sh`'
    fi

    info "Creating dynamic passwords"
    templater -i vars.yaml -o vars.yaml
    yq e -i '.global.domainName = strenv(DOMAIN_NAME)' vars.yaml
}

function set_permissions() {
    info "Setting proper permission for shared folder"
    sudo mkdir -p /openreplay/storage/nfs
    sudo chown -R 1001:1001 /openreplay/storage/nfs
}

## Installing OpenReplay
function install_openreplay() {
    [[ $OR_CORE_ONLY ]] || {
        info "installing toolings"
        helm uninstall tooling -n app || true
        helm upgrade --install toolings ./toolings -n app --create-namespace --wait -f ./vars.yaml --atomic --debug ${HELM_OPTIONS}
    }
    info "installing databases"
    helm upgrade --install databases ./databases -n db --create-namespace --wait -f ./vars.yaml --atomic --debug ${HELM_OPTIONS}
    info "installing application"
    helm upgrade --install openreplay ./openreplay -n app --create-namespace --wait -f ./vars.yaml --atomic --debug ${HELM_OPTIONS}
}

function conditional_step() {
    local skip_var=$1
    local action=$2
    local message=$3

    if [[ ${!skip_var} == "1" ]]; then
        echo "$message"
    else
        $action
    fi
}

function install_openreplay_actions() {
    set_permissions
    sudo mkdir -p /var/lib/openreplay
    sudo cp -f openreplay-cli /bin/openreplay
    install_openreplay

    local openreplay_code_dir="/var/lib/openreplay/openreplay"
    local openreplay_home_dir="/var/lib/openreplay"
    if [[ -d $openreplay_code_dir ]]; then
        local versions_file="/var/lib/openreplay/or_versions.txt"
        date +%m-%d-%Y-%H%M%S | sudo tee -a $versions_file
        sudo git log -1 2>&1 | sudo tee -a $versions_file
        sudo rm -rf $openreplay_code_dir
    fi
    sudo cp -rfb ./vars.yaml $openreplay_home_dir
    sudo cp -rf "$(cd ../.. && pwd)" $openreplay_home_dir
}

function main() {
    conditional_step "SKIP_K8S_INSTALL" install_k8s "Skipping Kubernetes installation."
    conditional_step "SKIP_K8S_TOOLS" install_tools "Skipping Kubernetes tools installation."
    conditional_step "SKIP_ROTATE_SECRETS" create_passwords "Skipping secrets rotation."
    conditional_step "SKIP_OR_INSTALL" install_openreplay_actions "Skipping OpenReplay installation."
}

main

info "Configuration file is saved in /var/lib/openreplay/vars.yaml"
info "You can delete the directory $(cd ../.. && pwd). Backup stored in /var/lib/openreplay"
info "Run ${BWHITE}openreplay -h${GREEN} to see the cli information to manage OpenReplay."
