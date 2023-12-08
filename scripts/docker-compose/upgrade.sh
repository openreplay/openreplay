#!/bin/bash

# Path to the original and new env files
original_env_file="$1"

if [ ! -s "$original_env_file" ]; then
	echo "Error: The original env file is empty or does not exist."
	echo "Usage: $0 /path/to/original.env"
	exit 1
fi

new_env_file="./common.env"

# Create a temporary file for the updated env
temp_env_file=$(mktemp)

function merge_envs() {
	while IFS='=' read -r key value; do
		# Skip the line if the key is COMMON_VERSION
		case "$key" in
		COMMON_VERSION)
			original_version=$(echo "$value" | xargs)
			continue
			;;
		COMMON_PG_PASSWORD)
			pgpassword=$value
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

function parse_version() {
	local version=${1#v} # Remove 'v' if present
	IFS='.' read -r major minor patch <<<"$version"
	echo "$major $minor"
}

# We need to remove version dots
function normalise_version {
	echo "$@" | awk -F. '{ printf("%d%03d%03d%03d\n", $1,$2,$3,$4); }'
}
function log_message() {
	echo "$@" >&2
}
function create_migration_versions() {
	# Checking migration versions
	cd "${SCHEMA_DIR:-/opt/openreplay/openreplay/scripts/schema}" || {
		log_message not able to cd $SCHEMA_DIR
		exit 100
	}

	db=postgresql
	all_versions=($(ls -l db/init_dbs/$db | grep -E ^d | grep -v create | awk '{print $NF}'))

	migration_versions=($(for ver in ${all_versions[*]}; do if [[ $(normalise_version $ver) > $(normalise_version "${PREVIOUS_APP_VERSION}") ]]; then echo $ver; fi; done | sort -V))

	joined_migration_versions=$(
		IFS=,
		echo "${migration_versions[*]}"
	)

	cd - >/dev/null || {
		log_message "not able to cd back"
		exit 100
	}

	log_message "output: $joined_migration_versions"
	echo "$joined_migration_versions"
}

function migrate() {
	export SCHEMA_DIR="../schema/"
	export PREVIOUS_APP_VERSION=${original_version#v}

	IFS=',' read -ra joined_migration_versions <<<"$(create_migration_versions)"
	[[ ${#joined_migration_versions[@]} -eq 0 ]] && {
		echo Nothing to migrate
		return
	}
	for ver in ${joined_migration_versions[*]}; do
		echo $ver
		echo docker run --rm --network openreplay-net --name pgmigrate \
			-e "PGHOST=postgres" -e "PGPORT=5432" -e "PGDATABASE=postgres" \
			-e "PGUSER=postgres" -e "PGPASSWORD=$pgpassword" \
			-v /opt/data/:$SCHEMA_DIR \
			postgres \
			psql -f /file/from/host
	done
}

# Upgrade postgresql
merge_envs
migrate
