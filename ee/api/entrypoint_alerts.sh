#!/bin/sh
export TZ=UTC

# Ensure pip-installed binaries are in PATH
export PATH=/usr/local/bin:$PATH

export ASSIST_KEY=ignore
export CH_POOL=false
sh env_vars.sh
source /tmp/.env.override
uvicorn app:app --host 0.0.0.0 --port 8888  --log-level ${S_LOGLEVEL:-warning}
