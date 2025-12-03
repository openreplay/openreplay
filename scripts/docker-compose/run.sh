# Load variables from common.env into the current shell's environment
set -a # automatically export all variables
source common.env
set +a

# Use the `envsubst` command to substitute the shell environment variables into reference_var.env and output to a combined .env
find ./ -type f \( -iname "*.env" -o -iname "docker-compose.yaml" \) ! -name "common.env" -exec /bin/bash -c 'file="{}";cp "$file" "$file.bak"; envsubst < "$file.bak" > "$file"; rm "$file.bak"' \;

sudo -E docker-compose up -d
