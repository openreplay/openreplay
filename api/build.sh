#!/bin/bash

# Script to build api module
# flags to accept:
# envarg: build for enterprise edition.
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

# Helper function
exit_err() {
  err_code=$1
  if [[ err_code != 0 ]]; then
    exit $err_code
  fi
}

environment=$1
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
    destination="_api"
    [[ $1 == "ee" ]] && {
        destination="_api_ee"
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
    mv Dockerfile.dockerignore .dockerignore
    docker build -f ./Dockerfile --build-arg envarg=$envarg -t ${DOCKER_REPO:-'local'}/chalice:${git_sha1} .
    cd ../api
    rm -rf ../${destination}
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/chalice:${git_sha1}
        docker tag ${DOCKER_REPO:-'local'}/chalice:${git_sha1} ${DOCKER_REPO:-'local'}/chalice:${tag}latest
        docker push ${DOCKER_REPO:-'local'}/chalice:${tag}latest
    }
    echo "api docker build completed"
}

check_prereq
build_api $environment
echo buil_complete
IMAGE_TAG=$IMAGE_TAG PUSH_IMAGE=$PUSH_IMAGE DOCKER_REPO=$DOCKER_REPO bash build_alerts.sh $1

[[ $environment == "ee" ]] && {
  cp ../ee/api/build_crons.sh .
  IMAGE_TAG=$IMAGE_TAG PUSH_IMAGE=$PUSH_IMAGE DOCKER_REPO=$DOCKER_REPO bash build_crons.sh $1
  exit_err $?
  rm build_crons.sh
} || true
