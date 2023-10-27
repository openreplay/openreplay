#!/bin/sh

uvicorn app:app --host 0.0.0.0 --port $LISTEN_PORT --proxy-headers --log-level ${S_LOGLEVEL:-warning}
