#!/bin/bash

if [[ -z "${ENV_CONFIG_OVERRIDE_PATH}" ]]; then
  echo 'no env-override'
else
  override=$ENV_CONFIG_OVERRIDE_PATH
  if [ -f "$override" ]; then
    cp $override .env.override
    override=.env.override
    source $override
  else
    echo "$override does not exist."
  fi

fi