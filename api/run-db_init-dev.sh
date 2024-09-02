#!/bin/zsh
set -a
. .env
pg_dbname='release_test'
init_script='../scripts/schema/db/init_dbs/postgresql/init_schema.sql'

PGPASSWORD=$pg_password
psql -h $pg_host -p $pg_port -U $pg_user -v ON_ERROR_STOP=1 -c "CREATE DATABASE $pg_dbname;"
sleep 1s
psql -h $pg_host -p $pg_port -U $pg_user -d $pg_dbname -v ON_ERROR_STOP=1 -f $init_script
sleep 1s
psql -h $pg_host -p $pg_port -U $pg_user -v ON_ERROR_STOP=1 -c "DROP DATABASE $pg_dbname;"