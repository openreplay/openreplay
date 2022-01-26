#!/bin/bash

# Script to build api module
# flags to accept:
# ee: build for enterprise edition.
# Default will be OSS build.

# Usage: bash build.sh <ee>

git_sha1=$(git rev-parse HEAD)
ee="false"
check_prereq() {
    which docker || {
        echo "Docker not installed, please install docker."
        exit=1
    }
    [[ exit -eq 1 ]] && exit 1
}

function build(){
    # Run docker as the same user, else we'll run in to permission issues.
    docker run --rm -v /etc/passwd:/etc/passwd -u `id -u`:`id -g` -v $(pwd):/home/${USER} -w /home/${USER} --name node_build node:14-stretch-slim /bin/bash -c "npm install && npm run build:oss"
}

check_prereq
build $1
