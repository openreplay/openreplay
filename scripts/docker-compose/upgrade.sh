#!/usr/bin/env bash

# Path to the original and new env files
original_env_file="$1"

# Check if the original env file exists and is not empty
if [ ! -s "$original_env_file" ]; then
	echo "Error: The original env file is empty or does not exist."
	echo "Usage: $0 /path/to/original.env"
	exit 1
fi

new_env_file="./common.env"
temp_env_file=$(mktemp)

# Function to merge environment variables from original to new env file
function merge_envs() {
	while IFS='=' read -r key value; do
		# Skip the line if the key is COMMON_VERSION
		case "$key" in
		COMMON_VERSION)
			original_version=$(echo "$value" | xargs)
			continue
			;;
		COMMON_PG_PASSWORD)
			pgpassword=$(echo $value | xargs)
			;;
		POSTGRES_VERSION | REDIS_VERSION | MINIO_VERSION)
			# Don't update db versions automatically.
			continue
			;;
		esac

		# Remove any existing entry from the new env file and add the new value
		grep -v "^$key=" "$new_env_file" >"$temp_env_file"
		mv "$temp_env_file" "$new_env_file"
		echo "$key=$value" >>"$new_env_file"
	done <"$original_env_file"
}

# Function to normalize version numbers for comparison
function normalise_version {
	echo "$1" | awk -F. '{ printf("%03d%03d%03d\n", $1, $2, $3); }'
}

# Function to log messages
function log_message() {
	echo "$@" >&2
}

# Function to create migration versions based on the current and previous application versions
function create_migration_versions() {
	SCHEMA_DIR="../schema/"
	cd $SCHEMA_DIR || {
		log_message "not able to cd $SCHEMA_DIR"
		exit 100
	}

	db=postgresql
	# List all version directories excluding 'create' directory
	all_versions=($(find db/init_dbs/$db -maxdepth 1 -type d -exec basename {} \; | grep -v create))

	# Normalize the previous application version for comparison
	PREVIOUS_APP_VERSION_NORMALIZED=$(normalise_version "${PREVIOUS_APP_VERSION}")

	migration_versions=()
	for ver in "${all_versions[@]}"; do
		if [[ $(normalise_version "$ver") > "$PREVIOUS_APP_VERSION_NORMALIZED" ]]; then
			migration_versions+=("$ver")
		fi
	done

	# Join migration versions into a single string separated by commas
	joined_migration_versions=$(
		IFS=,
		echo "${migration_versions[*]}"
	)

	# Return to the previous directory
	cd - >/dev/null || {
		log_message "not able to cd back"
		exit 100
	}

	log_message "output: $joined_migration_versions"
	echo "$joined_migration_versions"
}

export SCHEMA_DIR="$(readlink -f ../schema/)"
echo $SCHEMA_DIR
# Function to perform migration
function migrate() {
	# Set schema directory and previous application version
	export PREVIOUS_APP_VERSION=${original_version#v}

	# Create migration versions array
	IFS=',' read -ra joined_migration_versions <<<"$(create_migration_versions)"
	# Check if there are versions to migrate
	[[ ${#joined_migration_versions[@]} -eq 0 ]] && {
		echo "Nothing to migrate"
		return
	}
	# Loop through versions and prepare Docker run commands
	for ver in "${joined_migration_versions[@]}"; do
		echo "$ver"
		docker run --rm --network docker-compose_opereplay-net \
			--name pgmigrate -e PGHOST=postgres -e PGPORT=5432 \
			-e PGDATABASE=postgres -e PGUSER=postgres -e PGPASSWORD=$pgpassword \
			-v $SCHEMA_DIR:/opt/data/ postgres psql -f /opt/data/db/init_dbs/postgresql/$ver/$ver.sql
	done
}

# Merge environment variables and perform migration
merge_envs
migrate

# Load variables from common.env into the current shell's environment
set -a # automatically export all variables
source common.env
set +a

# Use the `envsubst` command to substitute the shell environment variables into reference_var.env and output to a combined .env
find ./ -type f \( -iname "*.env" -o -iname "docker-compose.yaml" \) ! -name "common.env" -exec /bin/bash -c 'file="{}";cp "$file" "$file.bak"; envsubst < "$file.bak" > "$file"; rm "$file.bak"' \;

sudo -E docker-compose up -d
