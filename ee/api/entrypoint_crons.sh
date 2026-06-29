#!/bin/sh
export TZ=UTC

# Ensure pip-installed binaries are in PATH
export PATH=/usr/local/bin:$PATH

export ASSIST_KEY=ignore
sh env_vars.sh
source /tmp/.env.override
python app_crons.py $ACTION
