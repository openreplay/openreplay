#!/bin/sh
sh env_vars.sh
source .env.override
python app_crons.py $ACTION
