#!/bin/bash

if git diff @{push} --cached --name-only | grep --quiet 'tracker$'
then
  pwd
else
  exit 0
fi
