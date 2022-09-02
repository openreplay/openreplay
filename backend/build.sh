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
        exit 1
    }
    return
}

function build_service() {
    image="$1"
    echo "BUILDING $image"
    docker build -t ${DOCKER_REPO:-'local'}/$image:${git_sha1} --platform linux/amd64 --build-arg SERVICE_NAME=$image .
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/$image:${git_sha1}
    }
    return
}

function build_api(){
    cp -R ../backend ../_backend
    cd ../_backend
    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -r ../ee/backend/* ./
        ee="true"
    }
    [[ $2 != "" ]] && {
        build_service $2
        return
    }
    for image in $(ls cmd);
    do
        build_service $image
        echo "::set-output name=image::${DOCKER_REPO:-'local'}/$image:${git_sha1}"
    done
    cd ../backend
    rm -rf ../_backend
    echo "backend build completed"
}

check_prereq
build_api $1 $2
