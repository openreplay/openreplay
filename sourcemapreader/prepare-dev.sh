#!/bin/bash
SERVICE_NAME='sourcemaps-reader'
curl -O https://unpkg.com/source-map@0.7.4/lib/mappings.wasm
rsync -avr --exclude=".*" --ignore-existing ../assist/utils ./