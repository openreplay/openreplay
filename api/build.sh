#!/bin/bash

# Script to build api module
# flags to accept:
# envarg: build for enterprise edition.
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

# Helper function
exit_err() {
    err_code=$1
    if [[ $err_code != 0 ]]; then
        exit $err_code
    fi
}

source ../scripts/lib/_docker.sh
ARCH=${ARCH:-'amd64'}

environment=$1
git_sha=$(git rev-parse --short HEAD)
image_tag=${IMAGE_TAG:-git_sha}
envarg="default-foss"
chart="chalice"
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
    return
}

[[ $1 == ee ]] && ee=true
[[ $PATCH -eq 1 ]] && {
    image_tag="$(grep -ER ^.ppVersion ../scripts/helmcharts/openreplay/charts/$chart | xargs | awk '{print $2}' | awk -F. -v OFS=. '{$NF += 1 ; print}')"
    [[ $ee == "true" ]] && {
        image_tag="${image_tag}-ee"
    }
}
update_helm_release() {
    [[ $ee == "true" ]] && return
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
    destination="_api"
    [[ $1 == "ee" ]] && {
        destination="_api_ee"
    }
    [[ -d ../${destination} ]] && {
        echo "Removing previous build cache"
        rm -rf ../${destination}
    }
    cp -R ../api ../${destination}
    cd ../${destination} || exit_err 100
    tag=""
    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -rf ../ee/api/* ./
        envarg="default-ee"
        tag="ee-"
    }
    mv Dockerfile.dockerignore .dockerignore
    docker build -f ./Dockerfile --platform linux/${ARCH} --build-arg envarg=$envarg --build-arg GIT_SHA=$git_sha -t ${DOCKER_REPO:-'local'}/${IMAGE_NAME:-'chalice'}:${image_tag} .
    cd ../api || exit_err 100
    rm -rf ../${destination}
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/${IMAGE_NAME:-'chalice'}:${image_tag}
        docker tag ${DOCKER_REPO:-'local'}/${IMAGE_NAME:-'chalice'}:${image_tag} ${DOCKER_REPO:-'local'}/chalice:${tag}latest
        docker push ${DOCKER_REPO:-'local'}/${IMAGE_NAME:-'chalice'}:${tag}latest
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/${IMAGE_NAME:-'chalice'}:${image_tag}
    }
    echo "api docker build completed"
}

check_prereq
build_api $environment
echo buil_complete
if [[ $PATCH -eq 1 ]]; then
    update_helm_release
fi
