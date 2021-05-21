from db.models import DetailedEvent
from psycopg2.errors import InternalError_


def transit_insert_to_redshift(db, df, table):

    try:
        insert_df(db.pdredshift, df, table)
    except InternalError_ as e:
        print(repr(e))
        print("loading failed. check stl_load_errors")


def insert_df(pr, df, table):
    # Write the DataFrame to S3 and then to redshift
    pr.pandas_to_redshift(data_frame=df,
                          redshift_table_name=table,
                          append=True,
                          delimiter='|')
