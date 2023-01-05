#!/bin/bash

# Script to build api module
# flags to accept:
# ee: build for enterprise edition.
# Default will be OSS build.

# Example
# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh

git_sha=$(git rev-parse --short HEAD)
image_tag=${IMAGE_TAG:-git_sha}
ee="false"
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 100
    }
}

# https://github.com/docker/cli/issues/1134#issuecomment-613516912
export DOCKER_BUILDKIT=1
function build(){
    # Run docker as the same user, else we'll run in to permission issues.
    docker build -t ${DOCKER_REPO:-'local'}/frontend:${image_tag} --platform linux/amd64 --build-arg GIT_SHA=$git_sha .
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/frontend:${image_tag}
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/frontend:${image_tag}
    }
    echo "frontend build completed"
}

check_prereq
build $1
