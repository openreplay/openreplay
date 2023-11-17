#!/bin/bash
set -e
# Must run inside tmux
# This script will build and push docker image to registry

# Usage: IMAGE_TAG=latest DOCKER_REPO=rg.fr-par.scw.cloud/foss bash build_deploy.sh

# Removing local alpine:latest image
docker rmi alpine || true

# Signing image
# cosign sign --key awskms:///alias/openreplay-container-sign image_url:tag
export SIGN_IMAGE=1
export PUSH_IMAGE=1
export AWS_DEFAULT_REGION="eu-central-1"
export SIGN_KEY="awskms:///alias/openreplay-container-sign"
echo $DOCKER_REPO
[[ -z $DOCKER_REPO ]] && {
    echo Set DOCKER_REPO="your docker registry"
    exit 1
} || {
    docker login $DOCKER_REPO
#    tmux set-option remain-on-exit on
    tmux split-window "cd ../../backend && IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=1 bash build.sh $@"
    tmux split-window "cd ../../assist && IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=1 bash build.sh $@"
    tmux select-layout tiled
    tmux split-window "cd ../../peers && IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=1 bash build.sh $@"
    tmux split-window "cd ../../frontend && IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=1 bash build.sh $@"
    tmux select-layout tiled
    tmux split-window "cd ../../sourcemapreader && IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=1 bash build.sh $@"
    tmux split-window "cd ../../api && IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=1 bash build.sh $@ \
      && IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=1 bash build_alerts.sh $@ \
      && IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=1 bash build_crons.sh $@ \
      && cd ../assist-stats && IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=1 bash build.sh $@"
    tmux select-layout tiled

}
