#!/bin/sh
sh env_vars.sh
source .env.override
uvicorn app:app --host 0.0.0.0 --reload
