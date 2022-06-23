#!/bin/bash

# Script to build api module
# flags to accept:
# ee: build for enterprise edition.
# Default will be OSS build.

# Example
# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh

git_sha1=${IMAGE_TAG:-$(git rev-parse HEAD)}
ee="false"
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit=1
    }
    [[ exit -eq 1 ]] && exit 1
}

function build(){
    cp .env.sample .env
    # Run docker as the same user, else we'll run in to permission issues.
    docker build -t ${DOCKER_REPO:-'local'}/frontend:${git_sha1} --platform linux/amd64 --build-arg SERVICE_NAME=$image .
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/frontend:${git_sha1}
    }
    echo "frotend build completed"
}

check_prereq
build $1
