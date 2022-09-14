#!/bin/sh
cd sourcemap-reader
nohup npm start &
cd ..
uvicorn app:app --host 0.0.0.0 --port $LISTEN_PORT --reload --proxy-headers
