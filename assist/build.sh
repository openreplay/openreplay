#!/bin/bash

# Script to build api module
# flags to accept:
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

git_sha=$(git rev-parse --short HEAD)
image_tag=${IMAGE_TAG:-git_sha}
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
}
source ../scripts/lib/_docker.sh

[[ $1 == ee ]] && ee=true
[[ $PATCH -eq 1 ]] && {
    image_tag="$(grep -ER ^.ppVersion ../scripts/helmcharts/openreplay/charts/$chart | xargs | awk '{print $2}' | awk -F. -v OFS=. '{$NF += 1 ; print}')"
    [[ $ee == "true" ]] && {
        image_tag="${image_tag}-ee"
    }
}
update_helm_release() {
    chart=$1
    HELM_TAG="$(grep -iER ^version ../scripts/helmcharts/openreplay/charts/$chart | awk '{print $2}' | awk -F. -v OFS=. '{$NF += 1 ; print}')"
    # Update the chart version
    sed -i "s#^version.*#version: $HELM_TAG# g" ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    # Update image tags
    sed -i "s#ppVersion.*#ppVersion: \"$image_tag\"#g" ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    # Commit the changes
    git add ../scripts/helmcharts/openreplay/charts/$chart/Chart.yaml
    git commit -m "chore(helm): Updating $chart image release"
}

function build_api() {
    destination="_assist"
    [[ $1 == "ee" ]] && {
        destination="_assist_ee"
    }
    [[ -d ../${destination} ]] && {
        echo "Removing previous build cache"
        rm -rf ../${destination}
    }
    cp -R ../assist ../${destination}
    cd ../${destination}

    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -rf ../ee/assist/* ./
    }
    docker build -f ./Dockerfile --build-arg GIT_SHA=$git_sha -t ${DOCKER_REPO:-'local'}/assist:${image_tag} .

    cd ../assist
    rm -rf ../${destination}
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/assist:${image_tag}
        docker tag ${DOCKER_REPO:-'local'}/assist:${image_tag} ${DOCKER_REPO:-'local'}/assist:latest
        docker push ${DOCKER_REPO:-'local'}/assist:latest
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/assist:${image_tag}
    }
    echo "build completed for assist"
}

check_prereq
build_api $1
if [[ $PATCH -eq 1 ]]; then
    update_helm_release assist
fi
