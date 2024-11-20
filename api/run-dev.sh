#!/bin/zsh
export TZ=UTC

uvicorn app:app --reload --log-level ${S_LOGLEVEL:-warning}