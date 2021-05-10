#!/bin/bash

clear
cat << EOF
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█░▄▄▀█░▄▄█░▄▄▀█░██░█░▄▄█░▄▄▀███░▄▄▀█▀▄▄▀█▀▄▄▀█░▄▄
█░▀▀░█▄▄▀█░▀▀░█░▀▀░█░▄▄█░▀▀▄███░▀▀░█░▀▀░█░▀▀░█▄▄▀
█░██░█▄▄▄█▄██▄█▀▀▀▄█▄▄▄█▄█▄▄███░██░█░████░████▄▄▄
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
EOF

# Global vars
namespace=app
cwd=$PWD

# Create namespaces
kubectl get ns app &> /dev/null || kubectl create ns app

# Creating secrets
bash docker_registry.sh

{
# Installing all apps
echo $(date) >> helm.log
for app in $(ls *.yaml); do
    application=$(echo $app | cut -d '.' -f1)
    echo -e ${white}${bold}Installing ${application}${reset}
    # helm uninstall -n ${namespace} ${application}
    helm upgrade --install -n ${namespace} ${application} -f $app ./openreplay --create-namespace &>> ${cwd}/helm_apps.log
    echo -e ${green}${bold}Done ✔${reset}
done
} || {
    echo -e Application installation faled. Please check ${red}${cwd}/helm_apps.log${reset} for more details.
}

# Setting kubernetes namespace
kubectl config set-context --current --namespace=$namespace
