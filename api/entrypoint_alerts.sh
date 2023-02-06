#!/bin/sh
export ASSIST_KEY=ignore
uvicorn app:app --host 0.0.0.0 --port $LISTEN_PORT --reload
