#/bin/bash

# --- helper functions for logs ---
info()
{
    echo '[INFO] ' "$@"
}
warn()
{
    echo '[WARN] ' "$@" >&2
}
fatal()
{
    echo '[ERROR] ' "$@" >&2
    exit 1
}

version="v1.5.4"
usr=`whoami`

# Installing k3s
curl -sL https://get.k3s.io | sudo K3S_KUBECONFIG_MODE="644" INSTALL_K3S_VERSION='v1.19.5+k3s2' INSTALL_K3S_EXEC="--no-deploy=traefik" sh -
mkdir ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
chmod 0644 ~/.kube/config
sudo chown -R $usr ~/.kube/config


## installing kubectl
which kubectl &> /dev/null || {
    info "kubectl not installed. Installing it..."
    sudo curl -SsL https://dl.k8s.io/release/v1.20.0/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl ; sudo chmod +x /usr/local/bin/kubectl
}

## installing stern
which stern &> /dev/null || {
    info "stern not installed. installing..."
    sudo curl -SsL https://github.com/derdanne/stern/releases/download/2.1.16/stern_linux_amd64 -o /usr/local/bin/stern ; sudo chmod +x /usr/local/bin/stern
}

## installing k9s
which k9s &> /dev/null || {
    info "k9s not installed. Installing it..."
    sudo curl -SsL https://github.com/derailed/k9s/releases/download/v0.24.2/k9s_Linux_x86_64.tar.gz -o /tmp/k9s.tar.gz
    cd /tmp
    tar -xf k9s.tar.gz
    sudo mv k9s /usr/local/bin/k9s
    sudo chmod +x /usr/local/bin/k9s
    cd -
}

## installing helm
which helm &> /dev/null
if [[ $? -ne 0 ]]; then
    info "helm not installed. Installing it..."
    curl -ssl https://get.helm.sh/helm-v3.4.2-linux-amd64.tar.gz -o /tmp/helm.tar.gz
    tar -xf /tmp/helm.tar.gz
    chmod +x linux-amd64/helm
    sudo cp linux-amd64/helm /usr/local/bin/helm
    rm -rf linux-amd64/helm /tmp/helm.tar.gz
fi

## Installing openssl
sudo apt update &> /dev/null
sudo apt install openssl -y &> /dev/null

randomPass() {
    openssl rand -hex 10
}

## Prepping the infra

[[ -z $DOMAIN_NAME ]] && {
fatal 'DOMAIN_NAME variable is empty. Rerun the script `DOMAIN_NAME=openreplay.mycomp.org bash init.sh `'
}

info "Creating dynamic passwords"
sed -i "s/postgresqlPassword: \"changeMePassword\"/postgresqlPassword: \"$(randomPass)\"/g" vars.yaml
sed -i "s/accessKey: \"changeMeMinioAccessKey\"/accessKey: \"$(randomPass)\"/g" vars.yaml
sed -i "s/secretKey: \"changeMeMinioPassword\"/secretKey: \"$(randomPass)\"/g" vars.yaml
sed -i "s/jwt_secret: \"SetARandomStringHere\"/jwt_secret: \"$(randomPass)\"/g" vars.yaml
sed -i "s/domainName: \"\"/domainName: \"${DOMAIN_NAME}\"/g" vars.yaml

## Installing OpenReplay
info "Installing databases"
helm upgrade --install databases ./databases -n db --create-namespace --wait -f ./vars.yaml --atomic
info "Installing application"
helm upgrade --install openreplay ./openreplay -n app --create-namespace --wait -f ./vars.yaml --atomic
