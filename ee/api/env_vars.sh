#!/bin/bash

if [[ -z "${ENV_CONFIG_OVERRIDE_PATH}" ]]; then
  echo 'no env-override'
else
  override=$ENV_CONFIG_OVERRIDE_PATH
  if [ -f "$override" ]; then
    cp $override .env.override
    override=.env.override

    # to remove all defined os-env-vars
    cat $override | while read line
    do
       export $line
    done
  else
    echo "$override does not exist."
  fi

fi