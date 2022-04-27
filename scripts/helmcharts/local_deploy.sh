#!/bin/bash
set -e

# This script will build and push docker image to registry

# Usage: IMAGE_TAG=latest DOCKER_REPO=rg.fr-par.scw.cloud/foss bash build_deploy.sh

export DOCKER_REPO="rg.fr-par.scw.cloud/foss"
export IMAGE_TAG=`grep fromVersion vars.yaml | awk '{print $NF}'|xargs`


apps=(
    api
    assets
    db
    ender
    http
    integrations
    sink
    storage
    assist
    peers
    all
)
help(){
    cat <<EOF
    Valid options are 
    echo ${apps[*]}
EOF
}

restart(){
    kubectl rollout restart deployment -n app "$1-openreplay"
    kubectl rollout status deployment -n app "$1-openreplay"
}

[[ -z DOCKER_REPO ]] && {
    echo Set DOCKER_REPO="your docker registry"
    exit 1
} || {
    case "$1" in
        api)
            echo $IMAGE_TAG
            cd ../../api
            source build.sh $@
            restart chalice
            ;;
        assets)
            cd ../../backend
            source build.sh nil assets
            restart assets
            ;;
        db)
            cd ../../backend
            source build.sh nil db
            restart db
            ;;
        ender)
            cd ../../backend
            source build.sh nil ender
            restart ender
            ;;
        http)
            cd ../../backend
            source build.sh nil http
            restart http
            ;;
        integrations)
            cd ../../backend
            source build.sh nil integrations
            restart integrations
            ;;
        sink)
            cd ../../backend
            source build.sh nil sink
            restart sink
            ;;
        storage)
            cd ../../backend
            source build.sh nil storage
            restart storage
            ;;
        assist)
            cd ../../utilities
            source build.sh $@
            restart assist
            ;;
        peers)
            cd ../../peers
            source build.sh $@
            restart peers
            ;;
        all)
            for app in ${apps[*]}
            do
                bash local_deploy.sh $app
            done
            ;;
        *)
            echo "unknown option;"
            help
            exit 1
            ;;
    esac
}
