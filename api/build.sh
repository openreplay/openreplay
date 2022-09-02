#!/bin/bash

# Script to build api module
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
    return
}

function build_api(){
    cp -R ../api ../_api
    cd ../_api
    cp -R ../utilities/utils ../sourcemap-reader/.
    cp -R ../sourcemap-reader .
    tag=""
    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -rf ../ee/api/* ./
        envarg="default-ee"
        tag="ee-"
    }
    docker build -f ./Dockerfile --build-arg envarg=$envarg -t ${DOCKER_REPO:-'local'}/chalice:${git_sha1} .
    cd ../api
    rm -rf ../_api
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/chalice:${git_sha1}
        docker tag ${DOCKER_REPO:-'local'}/chalice:${git_sha1} ${DOCKER_REPO:-'local'}/chalice:${tag}latest
        docker push ${DOCKER_REPO:-'local'}/chalice:${tag}latest
    }
    echo "api docker build completed"
}

check_prereq
build_api $1
echo buil_complete
IMAGE_TAG=$IMAGE_TAG PUSH_IMAGE=$PUSH_IMAGE DOCKER_REPO=$DOCKER_REPO bash build_alerts.sh $1

[[ $1 == "ee" ]] && {
  cp ../ee/api/build_crons.sh .
  IMAGE_TAG=$IMAGE_TAG PUSH_IMAGE=$PUSH_IMAGE DOCKER_REPO=$DOCKER_REPO bash build_crons.sh $1
}