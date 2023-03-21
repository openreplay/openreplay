#!/bin/bash

# Script to build api module
# flags to accept:
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

git_sha=$(git rev-parse --short HEAD)
image_tag=${IMAGE_TAG:-git_sha}
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
    cp -R ../assist/utils .
    cp ../sourcemap-reader/utils/health.js ./utils/.
    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -rf ../ee/peers/* ./
    }
    docker build -f ./Dockerfile --build-arg GIT_SHA=$git_sha -t ${DOCKER_REPO:-'local'}/peers:${image_tag} .
    cd ../peers
    rm -rf ../${destination}
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/peers:${image_tag}
        docker tag ${DOCKER_REPO:-'local'}/peers:${image_tag} ${DOCKER_REPO:-'local'}/peers:latest
        docker push ${DOCKER_REPO:-'local'}/peers:latest
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/peers:${image_tag}
    }
    echo "peer docker build complted"
}

check_prereq
build_api $1
