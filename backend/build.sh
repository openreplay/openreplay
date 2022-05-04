#!/bin/bash

# Script to build api module
# flags to accept:
# ee: build for enterprise edition.
# Default will be OSS build.

# Example
# Usage: IMAGE_TAG=latest DOCKER_REPO=myDockerHubID bash build.sh <ee>

git_sha1=${IMAGE_TAG:-$(git rev-parse HEAD)}
ee="false"
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit 1
    }
    return
}


function build_service() {
    image="$1"
    echo "BUILDING $image"
    case "$image" in
        http)
            echo build http
            docker build -t ${DOCKER_REPO:-'local'}/$image:${git_sha1} --build-arg SERVICE_NAME=$image -f ./cmd/Dockerfile .
            [[ $PUSH_IMAGE -eq 1 ]] && {
                docker push ${DOCKER_REPO:-'local'}/$image:${git_sha1}
            }
            ;;
        *)
            docker build -t ${DOCKER_REPO:-'local'}/$image:${git_sha1} --build-arg SERVICE_NAME=$image .
            [[ $PUSH_IMAGE -eq 1 ]] && {
                docker push ${DOCKER_REPO:-'local'}/$image:${git_sha1}
            }
            ;;
    esac
    return
}

function build_api(){
    # Copy enterprise code
    [[ $1 == "ee" ]] && {
        cp -r ../ee/backend/* ./
        ee="true"
    }
    [[ $2 != "" ]] && {
        build_service $2
        return
    }
    for image in $(ls services);
    do
        build_service $image
        echo "::set-output name=image::${DOCKER_REPO:-'local'}/$image:${git_sha1}"
    done
    echo "backend build completed"
}

check_prereq
build_api $1 $2
