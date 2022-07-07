#!/bin/bash
bash env_vars.sh
source .env.override
cd sourcemap-reader
nohup npm start &> /tmp/sourcemap-reader.log &
cd ..
uvicorn app:app --host 0.0.0.0 --reload --proxy-headers
