#!/bin/bash

if [[ -z "${ENV_CONFIG_OVERRIDE_PATH}" ]]; then
  echo 'no env-override'
else
  override=$ENV_CONFIG_OVERRIDE_PATH
  if [ -f "$override" ]; then
    cp $override .env.override
    $override=.env.override
    # to remove endOfLine form sed result
    echo "" >> $override
    sed 's/=.*//;/^$/d' $override > .replacements

    # to remove all defined os-env-vars
    cat .replacements | while read line
    do
       unset $line
    done
    rm .replacements

    # to merge predefined .env with the override.env
    cp .env .env.d
    sort -u -t '=' -k 1,1 $override .env.d > .env
    rm .env.d
  else
    echo "$override does not exist."
  fi

fi