#!/bin/bash

# Script to build api module
# flags to accept:
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

git_sha1=${IMAGE_TAG:-$(git rev-parse HEAD)}
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit=1
    }
    [[ exit -eq 1 ]] && exit 1
}

function build_api(){
    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -rf ../ee/utilities/* ./
    }
    docker build -f ./Dockerfile -t ${DOCKER_REPO:-'local'}/utilities:1.5.0 .
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/utilities:1.5.0
        docker build -f ./Dockerfile -t ${DOCKER_REPO:-'local'}/utilities:1.5.0-ee .
        docker push ${DOCKER_REPO:-'local'}/utilities:1.5.0-ee
    }
}

check_prereq
build_api $1
