#!/bin/bash

# Script to build crons module
# flags to accept:
# envarg: build for enterprise edition.
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

git_sha1=${IMAGE_TAG:-$(git rev-parse HEAD)}
envarg="default-foss"
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit=1
    }
    [[ exit -eq 1 ]] && exit 1
}

function build_api(){
    cp -R ../api ../_crons
    cd ../_crons
    tag=""
    # Copy enterprise code

    cp -rf ../ee/api/* ./
    envarg="default-ee"
    tag="ee-"

    docker build -f ./Dockerfile.crons --build-arg envarg=$envarg -t ${DOCKER_REPO:-'local'}/crons:${git_sha1} .
    cd ../api
    rm -rf ../_crons
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/crons:${git_sha1}
        docker tag ${DOCKER_REPO:-'local'}/crons:${git_sha1} ${DOCKER_REPO:-'local'}/crons:${tag}latest
        docker push ${DOCKER_REPO:-'local'}/crons:${tag}latest
    }
    echo "completed crons build"
}

check_prereq
build_api $1
