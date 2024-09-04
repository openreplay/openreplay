#!/bin/zsh
set -a
. .env

node cli.js -l \
            -k $API_KEY \
            -p $PROJECT_KEY \
            -s $USERVER \
            dir -m './maps' \
            -u $TARGET_URL