#!/bin/bash

set -o errtrace

# Check for a valid domain_name
domain_name=`grep domain_name vars.yaml | grep -v "example" | cut -d " " -f2 | cut -d '"' -f2`
# Ref: https://stackoverflow.com/questions/15268987/bash-based-regex-domain-name-validation
[[ $(echo $domain_name | grep -P '(?=^.{5,254}$)(^(?:(?!\d+\.)[a-zA-Z0-9_\-]{1,63}\.?)+(?:[a-zA-Z]{2,})$)') ]] || {
    echo "OpenReplay Needs a valid domain name for captured sessions to replay. For example, openreplay.mycompany.com"
    echo "Please enter your domain name"
    read domain_name
    [[ -z domain_name ]] && {
        echo "OpenReplay won't work without domain name. Exiting..."
        exit 1
    } || {
        sed -i "s#domain_name.*#domain_name: \"${domain_name}\" #g" vars.yaml
    }
}


# Installing k3s
curl -sL https://get.k3s.io | sudo K3S_KUBECONFIG_MODE="644" INSTALL_K3S_VERSION='v1.19.5+k3s2' INSTALL_K3S_EXEC="--no-deploy=traefik" sh -
mkdir ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(whoami) ~/.kube/config
export KUBECONFIG=~/.kube/config
sed -i "s#kubeconfig.*#kubeconfig_path: ${HOME}/.kube/config#g" vars.yaml

# Installing nfs common for NFS
sudo apt update
sudo apt install -y nfs-common

bash -x kube-install.sh $@
