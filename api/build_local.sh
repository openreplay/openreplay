#!/bin/bash

docker build -f ./Dockerfile --build-arg envarg="default-foss" -t chalice:local .