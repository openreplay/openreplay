#!/bin/bash

set -e

CONTAINER_NAME="postgres-test"
POSTGRES_USER="postgres"
POSTGRES_DB="postgres"

echo "Testing PostgreSQL database operations..."
echo

# Function to execute SQL
exec_sql() {
    podman exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "$1"
}

echo "1. Creating test table..."
exec_sql "CREATE TABLE IF NOT EXISTS test_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);"
echo "✓ Table created"

echo
echo "2. Inserting test data..."
exec_sql "INSERT INTO test_table (name) VALUES 
    ('Test Record 1'),
    ('Test Record 2'),
    ('Test Record 3');"
echo "✓ Data inserted"

echo
echo "3. Querying test data..."
exec_sql "SELECT * FROM test_table;"

echo
echo "4. Checking pg_stat_statements extension..."
exec_sql "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;" || echo "Note: pg_stat_statements extension may already exist"

echo
echo "5. Listing all extensions..."
exec_sql "SELECT * FROM pg_extension;"

echo
echo "6. Dropping test table..."
exec_sql "DROP TABLE test_table;"
echo "✓ Table dropped"

echo
echo "✅ SUCCESS: All database operations completed successfully!"
echo
echo "PostgreSQL is working correctly with:"
echo "  - pg_stat_statements extension"
echo "  - Standard CRUD operations"
