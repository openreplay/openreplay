#!/bin/sh
cd sourcemap-reader
nohup npm start &> /tmp/sourcemap-reader.log &
cd ..
uvicorn app:app --host 0.0.0.0 --reload --proxy-headers
