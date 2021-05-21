
def insert_to_clickhouse(db, df, table: str):
    df.to_sql(table, db.engine, if_exists='append', index=False)

