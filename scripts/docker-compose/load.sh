#!/bin/bash

# 0. Load .env file
set -a
source .env
set +a

# 1. envsubst common.env
envsubst < common.env > common.temporary.env && mv common.temporary.env common.env

# Load variables from common.env into the current shell's environment
set -a # automatically export all variables
source common.env
set +a

# Use the `envsubst` command to substitute the shell environment variables into reference_var.env and output to a combined .env
find . -type f \( -iname "*.env" -o -iname "docker-compose.yaml" \) ! -name "common.env" ! -name ".env" -exec /bin/bash -c 'file="{}"; git checkout -- "$file"; cp "$file" "$file.bak"; envsubst < "$file.bak" > "$file"; rm "$file.bak"' \;