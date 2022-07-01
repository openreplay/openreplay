#!/bin/bash
bash env_vars.sh
python app_crons.py $ACTION
