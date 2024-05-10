#!/bin/bash
docker() {
    local docker_cmd=${DOCKER_RUNTIME:-"docker"}
    [[ $docker_cmd == "docker" ]] && docker_cmd=$(which docker)
    if [[ "$1" == "build" ]]; then
        shift
        # Reconstruct command with DOCKER_ARGS before the '.'
        $docker_cmd build ${DOCKER_BUILD_ARGS} "$@"
    else
        $docker_cmd "$@"
    fi
}

export -f docker
