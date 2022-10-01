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

version="v1.8.1"
usr=`whoami`

# Installing k3s
[[ x$SKIP_K8S_INSTALL == "xtrue" ]] && {
    info "Skipping Kuberntes installation"
} || {
    curl -sL https://get.k3s.io | sudo K3S_KUBECONFIG_MODE="644" INSTALL_K3S_VERSION='v1.22.8+k3s1' INSTALL_K3S_EXEC="--no-deploy=traefik" sh -
    [[ -d ~/.kube ]] || mkdir ~/.kube
    sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
    sudo chmod 0644 ~/.kube/config
    sudo chown -R $usr ~/.kube/config
}

[[ x$SKIP_K8S_TOOLS == "xtrue" ]] && {
    info "Skipping Kuberntes installation"
} || {
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
}

# ## Installing openssl
# sudo apt update &> /dev/null
# sudo apt install openssl -y &> /dev/null

randomPass() {
    openssl rand -hex 10
}

## Prepping the infra

[[ -z $DOMAIN_NAME ]] && {
fatal 'DOMAIN_NAME variable is empty. Rerun the script `DOMAIN_NAME=openreplay.mycomp.org bash init.sh `'
}

# Mac os doesn't have gnu sed, which will cause compatibility issues.
# This wrapper will help to check the sed, and use the correct version="v1.8.1"
# Ref: https://stackoverflow.com/questions/37639496/how-can-i-check-the-version="v1.8.1"
function is_gnu_sed(){
  sed --version >/dev/null 2>&1
}

function sed_i_wrapper(){
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

info "Creating dynamic passwords"
sed_i_wrapper -i "s/postgresqlPassword: \"changeMePassword\"/postgresqlPassword: \"$(randomPass)\"/g" vars.yaml
sed_i_wrapper -i "s/accessKey: \"changeMeMinioAccessKey\"/accessKey: \"$(randomPass)\"/g" vars.yaml
sed_i_wrapper -i "s/secretKey: \"changeMeMinioPassword\"/secretKey: \"$(randomPass)\"/g" vars.yaml
sed_i_wrapper -i "s/jwt_secret: \"SetARandomStringHere\"/jwt_secret: \"$(randomPass)\"/g" vars.yaml
sed_i_wrapper -i "s/assistKey: \"SetARandomStringHere\"/assistKey: \"$(randomPass)\"/g" vars.yaml
sed_i_wrapper -i "s/domainName: \"\"/domainName: \"${DOMAIN_NAME}\"/g" vars.yaml

info "Setting proper permission for shared folder"
sudo mkdir -p /openreplay/storage/nfs
sudo chown -R 1001:1001 /openreplay/storage/nfs

## Installing OpenReplay
info "installing databases"
helm upgrade --install databases ./databases -n db --create-namespace --wait -f ./vars.yaml --atomic
info "installing application"
helm upgrade --install openreplay ./openreplay -n app --create-namespace --wait -f ./vars.yaml --atomic
