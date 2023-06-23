import pandas_redshift as pdredshift
from utils import pg_client
from decouple import config, Choices
import asyncio

DATABASE = config('CLOUD_SERVICE')
sessions_table_name = config('SESSIONS_TABLE', default='connector_user_sessions')
table = sessions_table_name
sslmode = config('DB_SSLMODE',
        cast=Choices(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']),
        default='allow'
)
ci = config('cluster_info', default='')
cluster_info = dict()
if ci == '':
    cluster_info['USER'] = config('USER')
    cluster_info['HOST'] = config('HOST')
    cluster_info['PORT'] = config('PORT')
    cluster_info['PASSWORD'] = config('PASSWORD')
    cluster_info['DBNAME'] = config('DBNAME')
else:
    ci = ci.split(' ')
    cluster_info = dict()
    for _d in ci:
        k,v = _d.split('=')
        cluster_info[k]=v
pdredshift.connect_to_redshift(dbname=cluster_info['DBNAME'],
                                    host=cluster_info['HOST'],
                                    port=cluster_info['PORT'],
                                    user=cluster_info['USER'],
                                    password=cluster_info['PASSWORD'],
                                    sslmode=sslmode)

async def main(limit = 100):
    query = "SELECT sessionid FROM {table} WHERE user_id = 'NULL' LIMIT {limit}"
    try:
        res = pdredshift.redshift_to_pandas(query.format(table=table, limit=limit))
    except Exception as e:
        print(repr(e))
    if len(res) == 0:
        return
    sessionids = list(map(lambda k: str(k), res['sessionid']))

    await pg_client.init()
    with pg_client.PostgresClient() as conn:
        conn.execute('SELECT session_id, user_id FROM sessions WHERE session_id IN ({session_id_list})'.format(
            session_id_list = ','.join(sessionids))
        )
        pg_res = conn.fetchall()

    base_query = "UPDATE {table} SET user_id = '{user_id}' WHERE sessionid = {session_id}"
    for e in pg_res:
        query = base_query.format(table=table, user_id=e['user_id'], session_id=e['session_id'])
        try:
            pdredshift.exec_commit(query)
        except Exception as e:
            print(repr(e))

if __name__ == '__main__':
    asyncio.run(main())
