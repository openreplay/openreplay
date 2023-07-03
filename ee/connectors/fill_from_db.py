import pandas_redshift as pdredshift
import pandas as pd
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from utils import pg_client
from decouple import config, Choices
import asyncio
from time import time


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


async def main():
    limit = config('FILL_QUERY_LIMIT', default=100, cast=int)
    t = time()
    query = "SELECT sessionid FROM {table} WHERE user_id = 'NULL' LIMIT {limit}"
    try:
        res = pdredshift.redshift_to_pandas(query.format(table=table, limit=limit))
    except Exception as e:
        print('[FILL Exception RDSHFT]',repr(e), 'while get user_id=NULL')
        res = list()
    if res is None:
        return
    elif len(res) == 0:
        return
    sessionids = list(map(lambda k: str(k), res['sessionid']))

    with pg_client.PostgresClient() as conn:
        conn.execute('SELECT session_id, user_id FROM sessions WHERE session_id IN ({session_id_list})'.format(
            session_id_list = ','.join(sessionids))
        )
        pg_res = conn.fetchall()
    df = pd.DataFrame(pg_res)
    df.dropna(inplace=True)
    df = df.groupby('user_id').agg({'session_id': lambda x: list(x)})
    base_query = "UPDATE {table} SET user_id = CASE".format(table=table)
    template = "\nWHEN sessionid IN ({session_ids}) THEN '{user_id}'"
    all_ids = list()
    for i in range(len(df)):
        user = df.iloc[i].name
        if user == '' or user == 'None' or user == 'NULL':
            continue
        aux = [str(sess) for sess in df.iloc[i].session_id]
        all_ids += aux
        if len(aux) == 0:
            continue
        base_query += template.format(user_id=user, session_ids=','.join(aux))
    base_query += f"\nEND WHERE sessionid IN ({','.join(all_ids)})"
    if len(all_ids) == 0:
        return
    try:
        pdredshift.exec_commit(base_query)
    except Exception as e:
        print('[FILL Exception RDSHFT]',repr(e), 'while replacing')
    print(f'[FILL-INFO] {time()-t} - for {len(sessionids)} elements')


cron_jobs = [
    {"func": main, "trigger": IntervalTrigger(seconds=config('REPLACE_INTERVAL_USERID', default=60)), "misfire_grace_time": 60, "max_instances": 1},
]


def get_or_create_eventloop():
    try:
        return asyncio.get_event_loop()
    except RuntimeError as ex:
        if "There is no current event loop in thread" in str(ex):
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return asyncio.get_event_loop()


if __name__ == '__main__':
    scheduler = AsyncIOScheduler()
    asyncio.run(pg_client.init())
    for job in cron_jobs:
        scheduler.add_job(id=job['func'].__name__, **job)
    loop = get_or_create_eventloop()
    scheduler.start()
    try:
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        pass
    asyncio.run(pg_client.terminate())
