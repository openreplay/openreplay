#!/bin/zsh

uvicorn app:app --reload --log-level ${LOGLEVEL:-warning}