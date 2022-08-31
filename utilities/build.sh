#!/bin/bash

# Script to build api module
# flags to accept:
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

git_sha1=${IMAGE_TAG:-$(git rev-parse HEAD)}
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
}

function build_api(){
    cp -R ../utilities ../_utilities
    cd ../_utilities

    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -rf ../ee/utilities/* ./
    }
    docker build -f ./Dockerfile -t ${DOCKER_REPO:-'local'}/assist:${git_sha1} .

    cd ../utilities
    rm -rf ../_utilities
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/assist:${git_sha1}
        docker tag ${DOCKER_REPO:-'local'}/assist:${git_sha1} ${DOCKER_REPO:-'local'}/assist:latest
        docker push ${DOCKER_REPO:-'local'}/assist:latest
    }
    echo "build completed for assist"
}

check_prereq
build_api $1
