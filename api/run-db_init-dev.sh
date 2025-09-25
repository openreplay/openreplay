#!/bin/zsh
set -a
. .env
pg_dbname='release_test'
init_script='../scripts/schema/db/init_dbs/postgresql/init_schema.sql'

PGPASSWORD=$pg_password
psql "host=$pg_host port=$pg_port user=$pg_user sslmode=$pg_sslmode" -v ON_ERROR_STOP=1 -c "CREATE DATABASE $pg_dbname;"  
sleep 1s
psql "host=$pg_host port=$pg_port user=$pg_user dbname=$pg_dbname sslmode=$pg_sslmode" -v ON_ERROR_STOP=1 -f $init_script
sleep 1s
psql "host=$pg_host port=$pg_port user=$pg_user sslmode=$pg_sslmode" -v ON_ERROR_STOP=1 -c "DROP DATABASE $pg_dbname;"  