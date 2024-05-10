#!/bin/bash

# Script to build api module
# flags to accept:
# envarg: build for enterprise edition.
# Default will be OSS build.

# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>
set -e

image_name="sourcemapreader"

git_sha=$(git rev-parse --short HEAD)
image_tag=${IMAGE_TAG:-git_sha}
envarg="default-foss"
source ../scripts/lib/_docker.sh

check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
    return
}

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
    destination="_smr"
    [[ $1 == "ee" ]] && {
        destination="_smr_ee"
    }
    [[ -d ../${destination} ]] && {
        echo "Removing previous build cache"
        rm -rf ../${destination}
    }
    cp -R ../sourcemapreader ../${destination}
    cd ../${destination}
    cp -R ../assist/utils .
    tag=""
    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -rf ../ee/sourcemapreader/* ./ || true # We share same codebase for ee/foss
        envarg="default-ee"
        tag="ee-"
    }
    docker build -f ./Dockerfile --build-arg GIT_SHA=$git_sha --build-arg envarg=$envarg -t ${DOCKER_REPO:-'local'}/${image_name}:${image_tag} .
    cd ../sourcemapreader
    rm -rf ../${destination}
    [[ $PUSH_IMAGE -eq 1 ]] && {
        docker push ${DOCKER_REPO:-'local'}/${image_name}:${image_tag}
        docker tag ${DOCKER_REPO:-'local'}/${image_name}:${image_tag} ${DOCKER_REPO:-'local'}/${image_name}:${tag}latest
        docker push ${DOCKER_REPO:-'local'}/${image_name}:${tag}latest
    }
    [[ $SIGN_IMAGE -eq 1 ]] && {
        cosign sign --key $SIGN_KEY ${DOCKER_REPO:-'local'}/$image_name:${image_tag}
    }
    echo "${image_name} docker build completed"
}

check_prereq
build_api $1
echo buil_complete
if [[ $PATCH -eq 1 ]]; then
    update_helm_release sourcemapreader
fi
