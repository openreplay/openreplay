#!/bin/sh
export TZ=UTC

# Ensure pip-installed binaries are in PATH
export PATH=/usr/local/bin:$PATH

uvicorn app:app --host 0.0.0.0 --port $LISTEN_PORT --proxy-headers --log-level ${S_LOGLEVEL:-warning}
