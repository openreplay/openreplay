#!/bin/bash
set -e

# This script will build and push docker image to registry

# Usage: IMAGE_TAG=latest DOCKER_REPO=rg.fr-par.scw.cloud/foss bash build_deploy.sh

# Removing local alpine:latest image
docker rmi alpine

echo $DOCKER_REPO
[[ -z DOCKER_REPO ]] && {
    echo Set DOCKER_REPO="your docker registry"
    exit 1
} || {
    docker login $DOCKER_REPO
    cd ../../backend
    PUSH_IMAGE=1 bash build.sh $@
    cd ../utilities
    PUSH_IMAGE=1 bash build.sh $@
    cd ../peers
    PUSH_IMAGE=1 bash build.sh $@
    cd ../frontend
    PUSH_IMAGE=1 bash build.sh $@
    cd ../api
    PUSH_IMAGE=1 bash build.sh $@
}
