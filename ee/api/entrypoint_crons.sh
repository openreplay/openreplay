#!/bin/sh
export ASSIST_KEY=ignore
sh env_vars.sh
source /tmp/.env.override
python app_crons.py $ACTION
