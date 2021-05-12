#!/bin/bash

# Script to build api module
# flags to accept:
# ee: build for enterprise edition.
# Default will be OSS build.

# Example
# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

git_sha1=${IMAGE_TAG:-$(git rev-parse HEAD)}
ee="false"
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
        cp -r ../ee/backend/* ./
        ee="true"
    }
    [[ $2 != "" ]] && {
        image="$2"
        docker build -t ${DOCKER_REPO:-'local'}/$image:${git_sha1} --build-arg SERVICE_NAME=$image .
        return
    }
    for image in $(ls services);
    do
        docker build -t ${DOCKER_REPO:-'local'}/$image:${git_sha1} --build-arg SERVICE_NAME=$image .
        echo "::set-output name=image::${DOCKER_REPO:-'local'}/$image:${git_sha1}"
    done
}

check_prereq
build_api $1 $2
