#!/bin/sh

touch /tmp/.env.override
if [[ -z "${ENV_CONFIG_OVERRIDE_PATH}" ]]; then
  echo 'no env-override'
else
  override=$ENV_CONFIG_OVERRIDE_PATH
  if [ -f "$override" ]; then
    cp $override /tmp/.env.override
  else
    echo "$override does not exist."
  fi

fi