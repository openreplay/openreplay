
def insert_to_snowflake(db, df, table):
    df.to_sql(table, db.engine, if_exists='append', index=False)


