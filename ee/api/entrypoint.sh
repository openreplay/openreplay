#!/bin/sh
sh env_vars.sh
source /tmp/.env.override

#uvicorn app:app --host 0.0.0.0 --port $LISTEN_PORT --proxy-headers
NB_WORKERS="${NB_WORKERS:=4}"
gunicorn app:app --workers $NB_WORKERS --worker-class uvicorn.workers.UvicornWorker \
                 --bind 0.0.0.0:$LISTEN_PORT  --log-level ${S_LOGLEVEL:-warning}