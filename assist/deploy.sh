#!/bin/bash
set -e
cd "${0%/*}"

IMAGE_NAME="199658938451.dkr.ecr.us-east-2.amazonaws.com/openreplay/assist"

echo 'Logging into AWS ECR'
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin $IMAGE_NAME

# due to the multiple instance types we use, we need to build for multiple platforms
docker buildx create --use --name=crossplat --node=crossplat
docker buildx build \
    --output "type=image,push=true" \
    --platform linux/amd64,linux/arm64 \
    --tag "$IMAGE_NAME:latest" .