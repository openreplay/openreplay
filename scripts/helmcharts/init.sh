#/bin/bash
set -e

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

version="v1.9.0"
usr=`whoami`

# Installing k3s
function install_k8s() {
    curl -sL https://get.k3s.io | sudo K3S_KUBECONFIG_MODE="644" INSTALL_K3S_VERSION='v1.22.8+k3s1' INSTALL_K3S_EXEC="--no-deploy=traefik" sh -
    [[ -d ~/.kube ]] || mkdir ~/.kube
    sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
    sudo chmod 0644 ~/.kube/config
    sudo chown -R $usr ~/.kube/config
    sleep 10
}

function install_tools() {
    ## installing kubectl
    which kubectl &> /dev/null || {
        info "kubectl not installed. Installing it..."
        sudo curl -SsL https://dl.k8s.io/release/v1.20.0/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl ; sudo chmod +x /usr/local/bin/kubectl
    }

    ## Installing GH package manager
    which eget &> /dev/null || {
        local version="1.3.0"
        info "eget not installed. Installing it..."
        curl -SsL https://github.com/zyedidia/eget/releases/download/v$version/eget-1.3.0-linux_amd64.tar.gz -o /tmp/eget.tar.gz
        cd /tmp
        tar -xf eget.tar.gz
        sudo mv eget-$version-linux_amd64/eget  /usr/local/bin/eget
        sudo chmod +x /usr/local/bin/eget
        cd -
    }

    ## installing stern
    which stern &> /dev/null || {
        info "stern not installed. installing..."
        sudo eget --to /usr/local/bin stern/stern
    }

    ## installing k9s
    which k9s &> /dev/null || {
        info "k9s not installed. Installing it..."
        sudo eget --to /usr/local/bin derailed/k9s
    }

    ## installing helm
    which helm &> /dev/null || {
        info "helm not installed. Installing it..."
        sudo eget --to /usr/local/bin https://get.helm.sh/helm-v3.10.2-linux-amd64.tar.gz -f helm
    }
}

# ## Installing openssl
# sudo apt update &> /dev/null
# sudo apt install openssl -y &> /dev/null

randomPass() {
    openssl rand -hex 10
}

## Prepping the infra

# Mac os doesn't have gnu sed, which will cause compatibility issues.
# This wrapper will help to check the sed, and use the correct version="v1.9.0"
# Ref: https://stackoverflow.com/questions/37639496/how-can-i-check-the-version="v1.9.0"
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

function create_passwords() {
  [[ -z $DOMAIN_NAME ]] && {
  fatal 'DOMAIN_NAME variable is empty. Rerun the script `DOMAIN_NAME=openreplay.mycomp.org bash init.sh `'
  }

  info "Creating dynamic passwords"
  sed_i_wrapper -i "s/postgresqlPassword: \"changeMePassword\"/postgresqlPassword: \"$(randomPass)\"/g" vars.yaml
  sed_i_wrapper -i "s/accessKey: \"changeMeMinioAccessKey\"/accessKey: \"$(randomPass)\"/g" vars.yaml
  sed_i_wrapper -i "s/secretKey: \"changeMeMinioPassword\"/secretKey: \"$(randomPass)\"/g" vars.yaml
  sed_i_wrapper -i "s/jwt_secret: \"SetARandomStringHere\"/jwt_secret: \"$(randomPass)\"/g" vars.yaml
  sed_i_wrapper -i "s/assistKey: \"SetARandomStringHere\"/assistKey: \"$(randomPass)\"/g" vars.yaml
  sed_i_wrapper -i "s/assistJWTSecret: \"SetARandomStringHere\"/assistJWTSecret: \"$(randomPass)\"/g" vars.yaml
  sed_i_wrapper -i "s/domainName: \"\"/domainName: \"${DOMAIN_NAME}\"/g" vars.yaml
}


function set_permissions() {
  info "Setting proper permission for shared folder"
  sudo mkdir -p /openreplay/storage/nfs
  sudo chown -R 1001:1001 /openreplay/storage/nfs
}

## Installing OpenReplay
function install_openreplay() {
  info "installing databases"
  helm upgrade --install databases ./databases -n db --create-namespace --wait -f ./vars.yaml --atomic
  info "installing application"
  helm upgrade --install openreplay ./openreplay -n app --create-namespace --wait -f ./vars.yaml --atomic
}

function main() {
  [[ x$SKIP_K8S_INSTALL == "x1" ]] && {
      info "Skipping Kuberntes installation"
  } || {
    install_k8s
  }
  [[ x$SKIP_K8S_TOOLS == "x1" ]] && {
      info "Skipping Kuberntes tools installation"
  } || {
    install_tools
  }
  create_passwords
  set_permissions
  [[ x$SKIP_OR_INSTALL == "x1" ]] && {
      info "Skipping OpenReplay installation"
  } || {
    install_openreplay
  }
}

main
