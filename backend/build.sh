#!/bin/bash

# Script to build api module
# flags to accept:
# ee: build for enterprise edition.
# Default will be OSS build.

# Example
# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>
set -e

GIT_ROOT=$(git rev-parse --show-toplevel)
source $GIT_ROOT/scripts/lib/_docker.sh

git_sha=$(git rev-parse --short HEAD)
image_tag=${IMAGE_TAG:-$git_sha}
ee="false"
# Possible values: amd64, arm64
arch="${ARCH:-"amd64"}"
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
    return
}

[[ $1 == ee ]] && ee=true
[[ $PATCH -eq 1 ]] && {
    chart=$2
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

function build_service() {
    image="$1"
    echo "BUILDING $image"
    docker build -t ${DOCKER_REPO:-'local'}/$image:${image_tag} --platform linux/$arch --build-arg ARCH=$arch --build-arg SERVICE_NAME=$image --build-arg GIT_SHA=$git_sha .
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/$image:${image_tag}
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/$image:${image_tag}
    }
    echo "Build completed for $image"
    return
}

function build_api() {
    destination="_backend"
    [[ $1 == "ee" ]] && {
        destination="_backend_ee"
    }
    [[ -d ../${destination} ]] && {
        echo "Removing previous build cache"
        rm -rf ../${destination}
    }
    cp -R ../backend ../${destination}
    cd ../${destination}
    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -r ../ee/backend/* ./
        ee="true"
    }
    [[ $2 != "" ]] && {
        build_service $2
        [[ $PATCH -eq 1 ]] && update_helm_release $2
        cd ../backend
        rm -rf ../${destination}
        return
    }
    for image in $(ls cmd); do
        build_service $image
        echo "::set-output name=image::${DOCKER_REPO:-'local'}/$image:${image_tag}"
        [[ $PATCH -eq 1 ]] && update_helm_release $image
    done
    cd ../backend
    rm -rf ../${destination}
    echo "backend build completed"
}

check_prereq
build_api "$1" "$2"
