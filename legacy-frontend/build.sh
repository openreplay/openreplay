#!/bin/bash

# Script to build api module
# flags to accept:
# ee: build for enterprise edition.
# Default will be OSS build.

# Example
# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh

ARCH=${ARCH:-amd64}

GIT_ROOT=$(git rev-parse --show-toplevel)
source $GIT_ROOT/scripts/lib/_docker.sh

git_sha=$(git rev-parse --short HEAD)
image_tag=${IMAGE_TAG:-$git_sha}
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 100
    }
}

# Sourcing init scripts
for file in ./build_init_*; do
    if [ -f "$file" ]; then
        echo "Sourcing $file"
        source "$file"
    fi
done

chart=frontend
[[ $1 == ee ]] && ee=true
[[ $PATCH -eq 1 ]] && {
    __app_version="$(grep -ER ^.ppVersion ../scripts/helmcharts/openreplay/charts/${chart} | xargs | awk '{print $2}' | awk -F. -v OFS=. '{$NF += 1 ; print}' | cut -d 'v' -f2)"
    sed -i "s/^VERSION = .*/VERSION = $__app_version/g" .env.sample
    image_tag="v${__app_version}"
    [[ $ee == "true" ]] && {
        image_tag="${image_tag}-ee"
    }
}
update_helm_release() {
    [[ $ee == true ]] && return
    HELM_TAG="$(grep -iER ^version ../scripts/helmcharts/openreplay/charts/$chart | awk '{print $2}' | awk -F. -v OFS=. '{$NF += 1 ; print}')"
    # Update the chart version
    sed -i "s#^version.*#version: $HELM_TAG# g" ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    # Update image tags
    sed -i "s#ppVersion.*#ppVersion: \"v${__app_version}\"#g" ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    # Commit the changes
    git add .env.sample
    git add ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    git commit -m "chore(helm): Updating $chart image release"
}

# https://github.com/docker/cli/issues/1134#issuecomment-613516912
export DOCKER_BUILDKIT=1
function build() {
    # Run docker as the same user, else we'll run in to permission issues.
    docker build -t ${DOCKER_REPO:-'local'}/frontend:${image_tag} --platform linux/${ARCH} --build-arg GIT_SHA=$git_sha .
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/frontend:${image_tag}
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/frontend:${image_tag}
    }
    echo "frontend build completed"
}

check_prereq
build $1
[[ $PATCH -eq 1 ]] && update_helm_release || true
