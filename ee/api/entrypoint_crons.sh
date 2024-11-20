#!/bin/sh
export TZ=UTC
export ASSIST_KEY=ignore
sh env_vars.sh
source /tmp/.env.override
python app_crons.py $ACTION
