#!/bin/bash

set -o errtrace

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
