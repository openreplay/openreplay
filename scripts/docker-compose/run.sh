# Load variables from root_var.env into the current shell's environment
set -a  # automatically export all variables
source common.env
set +a

# Use the `envsubst` command to substitute the shell environment variables into reference_var.env and output to a combined .env
find ./ -type f -iname "*.env" ! -path './common.env' -exec /bin/bash -c "git checkout -- {}; cp {} {}.bak; envsubst < {}.bak > {}; rm {}.bak" \;

docker-compose up -d
