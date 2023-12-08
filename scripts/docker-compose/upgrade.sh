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
    local content=""
    while IFS='=' read -r key value; do
        case "$key" in
        COMMON_VERSION)
            # Capture the original version for later use
            original_version=$(echo "$value" | xargs)
            ;;
        COMMON_PG_PASSWORD)
            # Store PostgreSQL password for later use
            pgpassword=$value
            ;;
        POSTGRES_VERSION | REDIS_VERSION | MINIO_VERSION)
            # Ignore certain variables
            ;;
        *)
            # Add other variables to content
            content+="${key}=${value}\n"
            ;;
        esac
    done <"$original_env_file"

    # Remove existing entries from new env file and add updated content
    grep -vFf <(printf "%s" "$content" | cut -d'=' -f1) "$new_env_file" >"$temp_env_file"
    printf "%b" "$content" >>"$temp_env_file"
    mv "$temp_env_file" "$new_env_file"
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
    cd "${SCHEMA_DIR:-/opt/openreplay/openreplay/scripts/schema}" || {
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

# Function to perform migration
function migrate() {
    # Set schema directory and previous application version
    export SCHEMA_DIR="../schema/"
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
        echo "docker run --rm --network openreplay-net \
      --name pgmigrate -e 'PGHOST=postgres' -e 'PGPORT=5432' \
      -e 'PGDATABASE=postgres' -e 'PGUSER=postgres' -e 'PGPASSWORD=$pgpassword' \
      -v /opt/data/:$SCHEMA_DIR postgres psql -f /opt/data/schema/db/init_dbs/postgresql/$ver/$ver.sql"
    done
}

# Merge environment variables and perform migration
merge_envs
migrate
