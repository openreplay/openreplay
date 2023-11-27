#!/bin/bash
set -e

# This script will build and push docker image to registry

# Usage: IMAGE_TAG=latest DOCKER_REPO=rg.fr-par.scw.cloud/foss bash build_deploy.sh

# Removing local alpine:latest image
docker rmi alpine || true

# Signing image
# cosign sign --key awskms:///alias/openreplay-container-sign image_url:tag
[[ -z $CI ]] && {
export COSIGN_YES=true # Skip confirmation
export SIGN_IMAGE=1
export PUSH_IMAGE=1
export AWS_DEFAULT_REGION="eu-central-1"
export SIGN_KEY="awskms:///alias/openreplay-container-sign"
}

echo $DOCKER_REPO
[[ -z $DOCKER_REPO ]] && {
    echo Set DOCKER_REPO="your docker registry"
    exit 1
} || {
    docker login $DOCKER_REPO
    cd ../../backend
    bash build.sh $@
    cd ../assist-stats/
    bash build.sh $@
    cd ../assist
    bash build.sh $@
    cd ../peers
    bash build.sh $@
    cd ../frontend
    bash build.sh $@
    cd ../sourcemapreader
    bash build.sh $@
    cd ../api
    bash build.sh $@
    bash build_alerts.sh $@
    bash build_crons.sh $@
}
