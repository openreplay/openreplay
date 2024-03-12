#!/bin/bash

# Script to build crons module
# flags to accept:
# envarg: build for enterprise edition.
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

git_sha1=${IMAGE_TAG:-$(git rev-parse HEAD)}
envarg="default-foss"
source ../scripts/lib/_docker.sh
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit=1
    }
    [[ exit -eq 1 ]] && exit 1
}

function build_crons() {
    destination="_crons_ee"
    cp -R ../api ../${destination}
    cd ../${destination}
    tag=""
    # Copy enterprise code

    cp -rf ../ee/api/* ./
    envarg="default-ee"
    tag="ee-"
    mv Dockerfile_crons.dockerignore .dockerignore
    docker build -f ./Dockerfile_crons --build-arg envarg=$envarg -t ${DOCKER_REPO:-'local'}/crons:${git_sha1} .
    cd ../api
    rm -rf ../${destination}
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/crons:${git_sha1}
        docker tag ${DOCKER_REPO:-'local'}/crons:${git_sha1} ${DOCKER_REPO:-'local'}/crons:${tag}latest
        docker push ${DOCKER_REPO:-'local'}/crons:${tag}latest
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/crons:${git_sha1}
    }
    echo "completed crons build"
}

check_prereq
[[ $1 == "ee" ]] && {
    build_crons $1
} || {
    echo -e "Crons is only for ee. Rerun the script using \n bash $0 ee"
    exit 100
}
