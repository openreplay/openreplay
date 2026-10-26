#!/bin/bash
SERVICE_NAME='sourcemaps-reader'
rsync -avr --exclude=".*" --ignore-existing ../assist/utils ./