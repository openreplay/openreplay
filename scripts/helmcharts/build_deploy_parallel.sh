#!/bin/bash
set -e
# Must run inside tmux
# This script will build and push docker image to registry

# Usage: IMAGE_TAG=latest DOCKER_REPO=DOCKER_REPO=public.ecr.aws/p1t3u8a3 bash build_deploy.sh

# Removing local alpine:latest image
docker rmi alpine || true

# Signing image
# cosign sign --key awskms:///alias/openreplay-container-sign image_url:tag
export SIGN_IMAGE=1
export ARCH=${ARCH:-"amd64"}
export PUSH_IMAGE=0
export AWS_DEFAULT_REGION="eu-central-1"
export SIGN_KEY="awskms:///alias/openreplay-container-sign"
echo $DOCKER_REPO
[[ -z $DOCKER_REPO ]] && {
    echo Set DOCKER_REPO="your docker registry"
    exit 1
} || {
    # docker login $DOCKER_REPO
    #    tmux set-option remain-on-exit on
    tmux split-window "cd ../../backend && DOCKER_RUNTIME="depot" DOCKER_BUILD_ARGS="--push" ARCH=$ARCH IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=0 bash build.sh $@; read"
    tmux split-window "cd ../../assist && DOCKER_RUNTIME="depot" DOCKER_BUILD_ARGS="--push" ARCH=$ARCH IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=0 bash build.sh $@; read"
    tmux select-layout tiled
    tmux split-window "cd ../../frontend && DOCKER_RUNTIME="depot" DOCKER_BUILD_ARGS="--push" ARCH=$ARCH IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=0 bash build.sh $@; read"
    tmux select-layout tiled
    tmux split-window "cd ../../sourcemapreader && DOCKER_RUNTIME="depot" DOCKER_BUILD_ARGS="--push" ARCH=$ARCH IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=0 bash build.sh $@; read"
    tmux split-window "cd ../../api && DOCKER_RUNTIME="depot" DOCKER_BUILD_ARGS="--push" ARCH=$ARCH IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=0 bash build.sh $@ \
      && DOCKER_RUNTIME="depot" DOCKER_BUILD_ARGS="--push" ARCH=$ARCH IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=0 bash build_alerts.sh $@ \
      && DOCKER_RUNTIME="depot" DOCKER_BUILD_ARGS="--push" ARCH=$ARCH IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=0 bash build_crons.sh $@ \
      && cd ../assist-stats && DOCKER_RUNTIME="depot" DOCKER_BUILD_ARGS="--push" ARCH=$ARCH IMAGE_TAG=$IMAGE_TAG DOCKER_REPO=$DOCKER_REPO PUSH_IMAGE=0 bash build.sh $@; read"
    tmux select-layout tiled

}
