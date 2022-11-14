#!/bin/bash

# Script to build alerts module
# flags to accept:
# envarg: build for enterprise edition.
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

git_sha1=${IMAGE_TAG:-$(git rev-parse HEAD)}
envarg="default-foss"
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
}

function build_alerts(){
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
    docker build -f ./Dockerfile_alerts --build-arg envarg=$envarg -t ${DOCKER_REPO:-'local'}/alerts:${git_sha1} .
    cd ../api
    rm -rf ../${destination}
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/alerts:${git_sha1}
        docker tag ${DOCKER_REPO:-'local'}/alerts:${git_sha1} ${DOCKER_REPO:-'local'}/alerts:${tag}latest
        docker push ${DOCKER_REPO:-'local'}/alerts:${tag}latest
    }
    echo "completed alerts build"
}

check_prereq
build_alerts $1
