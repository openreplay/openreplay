#!/bin/zsh
APP_NAME=crons \
PG_MINCONN=2 \
PG_MAXCONN=10 \
PG_POOL=false \
python app_crons.py $@