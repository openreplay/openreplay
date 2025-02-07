#!/bin/sh
export TZ=UTC
export ASSIST_KEY=ignore
export CH_POOL=false
uvicorn app:app --host 0.0.0.0 --port 8888 --log-level ${S_LOGLEVEL:-warning}
