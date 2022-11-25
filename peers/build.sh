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
    destination="_peers"
    [[ $1 == "ee" ]] && {
        destination="_peers_ee"
    }
    cp -R ../peers ../${destination}
    cd ../${destination}
    cp -R ../utilities/utils .
    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -rf ../ee/peers/* ./
    }
    docker build -f ./Dockerfile -t ${DOCKER_REPO:-'local'}/peers:${git_sha1} .
    cd ../peers
    rm -rf ../${destination}
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/peers:${git_sha1}
        docker tag ${DOCKER_REPO:-'local'}/peers:${git_sha1} ${DOCKER_REPO:-'local'}/peers:latest
        docker push ${DOCKER_REPO:-'local'}/peers:latest
    }
    echo "peer docker build complted"
}

check_prereq
build_api $1
