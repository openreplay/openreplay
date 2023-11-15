#!/bin/zsh

uvicorn app:app --reload --log-level ${S_LOGLEVEL:-warning}