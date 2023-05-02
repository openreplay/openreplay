from decouple import config

DATABASE = config('CLOUD_SERVICE')

from db.api import DBConnection
from db.utils import get_df_from_batch, dtypes_sessions
from db.tables import *

if DATABASE == 'redshift':
    from db.loaders.redshift_loader import transit_insert_to_redshift
    import pandas as pd
elif DATABASE == 'clickhouse':
    from db.loaders.clickhouse_loader import insert_to_clickhouse
elif DATABASE == 'pg':
    from db.loaders.postgres_loader import insert_to_postgres
elif DATABASE == 'bigquery':
    from db.loaders.bigquery_loader import insert_to_bigquery
    from bigquery_utils.create_table import create_tables_bigquery
elif DATABASE == 'snowflake':
    from db.loaders.snowflake_loader import insert_to_snowflake
else:
    raise Exception(f"{DATABASE}-database not supported")

# create tables if don't exist
_build_tables = config('build_tables', default=False, cast=bool)
if _build_tables:
    try:
        db = DBConnection(DATABASE)
        if DATABASE == 'pg':
            create_tables_postgres(db)
        if DATABASE == 'clickhouse':
            create_tables_clickhouse(db)
        if DATABASE == 'snowflake':
            create_tables_snowflake(db)
        if DATABASE == 'bigquery':
            create_tables_bigquery()
        if DATABASE == 'redshift':
            create_tables_redshift(db)
        db.engine.dispose()
        db = None
    except Exception as e:
        print(repr(e))
        print("Please create the tables with scripts provided in " +
          f"'/sql/{DATABASE}_sessions.sql' and '/sql/{DATABASE}_events.sql'")


def insert_batch(db: DBConnection, batch, table, level='normal'):
    if len(batch) == 0:
        return
    df = get_df_from_batch(batch, level=level)

    if db.config == 'redshift':
        transit_insert_to_redshift(db=db, df=df, table=table)
        return

    if db.config == 'clickhouse':
        insert_to_clickhouse(db=db, df=df, table=table)

    if db.config == 'pg':
        insert_to_postgres(db=db, df=df, table=table)

    if db.config == 'bigquery':
        insert_to_bigquery(df=df, table=table)

    if db.config == 'snowflake':
        insert_to_snowflake(db=db, df=df, table=table)


def update_batch(db: DBConnection, batch, table):
    if len(batch) == 0:
        return
    df = get_df_from_batch(batch, level='sessions')
    base_query = f"UPDATE {table} SET"
    for column_name, column_type in dtypes_sessions.items():
        if column_name == 'sessionid':
            continue
        elif column_type == 'string':
            df[column_name] = df[column_name].fillna('NULL')
            base_query += f" {column_name} = " + "'{" + f"{column_name}" + "}',"
        else:
            df[column_name] = df[column_name].fillna(0)
            base_query += f" {column_name} = " + "{" + f"{column_name}" + "},"
    base_query = base_query[:-1] + " WHERE sessionid = {sessionid};"
    for i in range(len(df)):
        if db.config == 'redshift':
            params = dict(df.iloc[i])
            query = base_query.format(**params)
            try:
                db.pdredshift.exec_commit(query)
            except Exception as e:
                print('[ERROR] Error while executing query')
                print(repr(e))
