#!/bin/bash

touch .env.override
if [[ -z "${ENV_CONFIG_OVERRIDE_PATH}" ]]; then
  echo 'no env-override'
else
  override=$ENV_CONFIG_OVERRIDE_PATH
  if [ -f "$override" ]; then
    cp $override .env.override
  else
    echo "$override does not exist."
  fi

fi