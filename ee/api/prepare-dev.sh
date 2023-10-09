#!/bin/bash

DOTENV_FILE=./.env
if [ -f "$DOTENV_FILE" ]; then
    echo "$DOTENV_FILE exists, nothing to do."
else
  cp env.dev $DOTENV_FILE
  echo "$DOTENV_FILE was created, please fill the missing required values."
fi

rsync -avr --exclude=".*" --ignore-existing ../../api/* ./