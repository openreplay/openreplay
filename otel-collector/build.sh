#!/bin/bash

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh
set -e

image_name="otel-collector"
chart="otel-collector"

ARCH=${ARCH:-amd64}
if [[ $ARCH == 'amd64' ]]; then
    ARCH='linux/amd64'
elif [[ $ARCH = 'arm64' ]]; then
    ARCH='linux/arm64'
fi

git_sha=$(git rev-parse --short HEAD)
image_tag=${IMAGE_TAG:-$git_sha}
source ../scripts/lib/_docker.sh

check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
}

[[ $PATCH -eq 1 ]] && {
    image_tag="$(grep -ER ^.ppVersion ../scripts/helmcharts/openreplay/charts/$chart | xargs | awk '{print $2}' | awk -F. -v OFS=. '{$NF += 1 ; print}')"
}

update_helm_release() {
    HELM_TAG="$(grep -iER ^version ../scripts/helmcharts/openreplay/charts/$chart | awk '{print $2}' | awk -F. -v OFS=. '{$NF += 1 ; print}')"
    sed -i "s#^version.*#version: $HELM_TAG# g" ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    sed -i "s#ppVersion.*#ppVersion: \"$image_tag\"#g" ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    git add ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    git commit -m "chore(helm): Updating $chart image release"
}

build() {
    docker build -f ./Dockerfile --platform "${ARCH}" -t ${DOCKER_REPO:-'local'}/${image_name}:${image_tag} .
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/${image_name}:${image_tag}
        docker tag ${DOCKER_REPO:-'local'}/${image_name}:${image_tag} ${DOCKER_REPO:-'local'}/${image_name}:latest
        docker push ${DOCKER_REPO:-'local'}/${image_name}:latest
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/${image_name}:${image_tag}
    }
    echo "${image_name} docker build completed"
}

check_prereq
build
if [[ $PATCH -eq 1 ]]; then
    update_helm_release
fi
