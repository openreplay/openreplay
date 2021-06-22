#!/bin/bash
cd /sourcemaps_reader
nohup node server.js &> /tmp/sourcemaps_reader.log &
cd /assist_server
nohup node server.js &> /tmp/sourcemaps_reader.log &
cd ..
python env_handler.py
chalice local --no-autoreload --host 0.0.0.0 --stage ${ENTERPRISE_BUILD}
