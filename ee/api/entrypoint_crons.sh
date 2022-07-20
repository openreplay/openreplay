#!/bin/sh
sh env_vars.sh
source /tmp/.env.override
python app_crons.py $ACTION
