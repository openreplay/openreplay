#!/bin/bash
python env_handler.py
chalice local --no-autoreload --host 0.0.0.0 --stage ${ENTERPRISE_BUILD}
