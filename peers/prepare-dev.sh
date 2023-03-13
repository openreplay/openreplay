#!/bin/bash
rsync -avr --exclude=".*" --ignore-existing ../assist/utils ./
cp ../sourcemap-reader/utils/health.js ./utils/.