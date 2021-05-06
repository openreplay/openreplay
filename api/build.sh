#!/bin/bash

# Script to build api module
# flags to accept:
# envarg: build for enterprize edition.
# Default will be OSS build.

# Usage: bash build.sh <ee>

git_sha1=$(git rev-parse HEAD)
envarg="default-foss"
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit=1
    }
    [[ exit -eq 1 ]] && exit 1
}

function build_api(){
    # Copy enterprize code
    [[ $1 == "ee" ]] && {
        cp -rf ../ee/api/* ./
        cp -rf ../ee/api/.chalice/* ./.chalice/
        envarg="default-ee"
    }
    docker build -f ./Dockerfile --build-arg envarg=$envarg -t ${DOCKER_REPO:-'local'}/chalice:${git_sha1} .
}

check_prereq
build_api $1
