#!/bin/bash

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

ARCH=${ARCH:-amd64}
# To keep backward compatibility with existing scripts
if [[ $ARCH == 'amd64' ]]; then
    ARCH='linux/amd64'
elif [[ $ARCH = 'arm64' ]]; then
    ARCH='linux/arm64'
fi

git_sha=$(git rev-parse --short HEAD)
image_tag=${IMAGE_TAG:-git_sha}
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
}
source ../scripts/lib/_docker.sh

[[ $PATCH -eq 1 ]] && {
    image_tag="$(grep -ER ^.ppVersion ../scripts/helmcharts/openreplay/charts/$chart | xargs | awk '{print $2}' | awk -F. -v OFS=. '{$NF += 1 ; print}')"
    image_tag="${image_tag}-ee"
}
update_helm_release() {
    chart=$1
    HELM_TAG="$(grep -iER ^version ../scripts/helmcharts/openreplay/charts/$chart | awk '{print $2}' | awk -F. -v OFS=. '{$NF += 1 ; print}')"
    # Update the chart version
    sed -i "s#^version.*#version: $HELM_TAG# g" ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    # Update image tags
    sed -i "s#ppVersion.*#ppVersion: \"$image_tag\"#g" ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    # Commit the changes
    git add ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    git commit -m "chore(helm): Updating $chart image release"
}

function build_api() {
    destination="_assist-server_ee"
    [[ -d ../${destination} ]] && {
        echo "Removing previous build cache"
        rm -rf ../${destination}
    }
    cp -R ../assist-server ../${destination}
    cd ../${destination} || exit 1
    cp -rf ../ee/assist-server/* ./

    docker build -f ./Dockerfile --platform ${ARCH} --build-arg GIT_SHA=$git_sha -t ${DOCKER_REPO:-'local'}/assist-server:${image_tag} .

    cd ../assist-server || exit 1
    rm -rf ../${destination}
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/assist-server:${image_tag}
        docker tag ${DOCKER_REPO:-'local'}/assist-server:${image_tag} ${DOCKER_REPO:-'local'}/assist-server:latest
        docker push ${DOCKER_REPO:-'local'}/assist-server:latest
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/assist-server:${image_tag}
    }
    echo "build completed for assist-server"
}

check_prereq
build_api $1
if [[ $PATCH -eq 1 ]]; then
    update_helm_release assist-server
fi
