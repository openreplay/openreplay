#!/bin/bash
bash env_vars.sh
uvicorn app:app --host 0.0.0.0 --reload --proxy-headers
