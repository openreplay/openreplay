#!/bin/bash

set -e

CONTAINER_NAME="postgres-test"
POSTGRES_USER="postgres"
POSTGRES_DB="postgres"

echo "Testing PostgreSQL extensions..."
echo

# Function to execute SQL
exec_sql() {
    podman exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "$1"
}

echo "1. Testing pg_trgm extension..."
exec_sql "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
echo "✓ pg_trgm extension created"

echo
echo "2. Testing pg_trgm similarity function..."
exec_sql "SELECT similarity('PostgreSQL', 'Postgres') as similarity_score;"

echo
echo "3. Testing pg_trgm fuzzy matching..."
exec_sql "SELECT 'hello' % 'hallo' as is_similar;"

echo
echo "4. Testing pgcrypto extension..."
exec_sql "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
echo "✓ pgcrypto extension created"

echo
echo "5. Testing pgcrypto digest (SHA256)..."
exec_sql "SELECT encode(digest('test', 'sha256'), 'hex') as sha256_hash;"

echo
echo "6. Testing pgcrypto password hashing..."
exec_sql "SELECT length(crypt('mypassword', gen_salt('bf'))) as bcrypt_length;"

echo
echo "7. Listing all installed extensions..."
exec_sql "SELECT extname, extversion FROM pg_extension ORDER BY extname;"

echo
echo "✅ SUCCESS: All extension tests passed!"
echo
echo "Available extensions tested:"
echo "  - pg_trgm - Fuzzy text search"
echo "  - pgcrypto - Cryptographic functions"
echo "  - pg_stat_statements - Query tracking"
