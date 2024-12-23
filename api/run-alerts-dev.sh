#!/bin/zsh
export TZ=UTC
export CH_POOL=false
uvicorn app_alerts:app --reload --port 8888 --log-level ${S_LOGLEVEL:-warning}