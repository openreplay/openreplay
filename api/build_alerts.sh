#!/bin/bash

# Script to build alerts module
# flags to accept:
# envarg: build for enterprise edition.
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

git_sha=$(git rev-parse --short HEAD)
image_tag=${IMAGE_TAG:-git_sha}
envarg="default-foss"
source ../scripts/lib/_docker.sh
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
}

[[ $1 == ee ]] && ee=true
[[ $PATCH -eq 1 ]] && {
    image_tag="$(grep -ER ^.ppVersion ../scripts/helmcharts/openreplay/charts/$chart | xargs | awk '{print $2}' | awk -F. -v OFS=. '{$NF += 1 ; print}')"
    [[ $ee == "true" ]] && {
        image_tag="${image_tag}-ee"
    }
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

function build_alerts() {
    destination="_alerts"
    [[ $1 == "ee" ]] && {
        destination="_alerts_ee"
    }
    cp -R ../api ../${destination}
    cd ../${destination}
    tag=""
    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -rf ../ee/api/* ./
        envarg="default-ee"
        tag="ee-"
    }
    mv Dockerfile_alerts.dockerignore .dockerignore
    docker build -f ./Dockerfile_alerts --build-arg envarg=$envarg --build-arg GIT_SHA=$git_sha -t ${DOCKER_REPO:-'local'}/alerts:${image_tag} .
    cd ../api
    rm -rf ../${destination}
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/alerts:${image_tag}
        docker tag ${DOCKER_REPO:-'local'}/alerts:${image_tag} ${DOCKER_REPO:-'local'}/alerts:${tag}latest
        docker push ${DOCKER_REPO:-'local'}/alerts:${tag}latest
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/alerts:${image_tag}
    }
    echo "completed alerts build"
}

check_prereq
build_alerts $1
if [[ $PATCH -eq 1 ]]; then
    update_helm_release alerts
fi
