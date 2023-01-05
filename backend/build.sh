#!/bin/bash

# Script to build api module
# flags to accept:
# ee: build for enterprise edition.
# Default will be OSS build.

# Example
# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>
set -e

git_sha=$(git rev-parse --short HEAD)
image_tag=${IMAGE_TAG:-git_sha}
ee="false"
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
    return
}

function build_service() {
    image="$1"
    echo "BUILDING $image"
    docker build -t ${DOCKER_REPO:-'local'}/$image:${image_tag} --platform linux/amd64 --build-arg SERVICE_NAME=$image --build-arg GIT_SHA=$git_sha .
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/$image:${image_tag}
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/$image:${image_tag}
    }
    echo "Build completed for $image"
    return
}

function build_api(){
    destination="_backend"
    [[ $1 == "ee" ]] && {
        destination="_backend_ee"
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
        cd ../backend
        rm -rf ../${destination}
        return
    }
    for image in $(ls cmd);
    do
        build_service $image
        echo "::set-output name=image::${DOCKER_REPO:-'local'}/$image:${image_tag}"
    done
    cd ../backend
    rm -rf ../${destination}
    echo "backend build completed"
}

check_prereq
build_api $1 $2
