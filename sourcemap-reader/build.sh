#!/bin/bash

# Script to build api module
# flags to accept:
# envarg: build for enterprise edition.
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>
set -e

image_name="sourcemaps-reader"

git_sha1=${IMAGE_TAG:-$(git rev-parse HEAD)}
envarg="default-foss"
tmp_folder_name="${image_name}_${RANDOM}"

check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
    return
}

function build_api(){
    destination="_smr"
    [[ $1 == "ee" ]] && {
        destination="_smr_ee"
    }
    cp -R ../sourcemap-reader ../${destination}
    cd ../${destination}
    cp -R ../utilities/utils .
    tag=""
    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -rf ../ee/sourcemap-reader/* ./
        envarg="default-ee"
        tag="ee-"
    }
    docker build -f ./Dockerfile --build-arg envarg=$envarg -t ${DOCKER_REPO:-'local'}/${image_name}:${git_sha1} .
    cd ../sourcemap-reader
    rm -rf ../${destination}
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/${image_name}:${git_sha1}
        docker tag ${DOCKER_REPO:-'local'}/${image_name}:${git_sha1} ${DOCKER_REPO:-'local'}/${image_name}:${tag}latest
        docker push ${DOCKER_REPO:-'local'}/${image_name}:${tag}latest
    }
    echo "${image_name} docker build completed"
}

check_prereq
build_api $1
echo buil_complete
