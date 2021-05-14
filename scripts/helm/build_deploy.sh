#!/bin/bash
set -e

# This script will build and push docker image to registry

echo $DOCKER_REPO
[[ -z DOCKER_REPO ]] && {
    echo Set DOCKER_REPO="your docker registry"
    exit 1
} || {
    docker login $DOCKER_REPO
    cd ../../api
    PUSH_IMAGE=1 bash build.sh
    cd ../backend
    PUSH_IMAGE=1 bash build.sh
}
