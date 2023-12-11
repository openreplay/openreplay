import asyncio
import hashlib
import mlflow
import os

import pandas as pd
import pendulum
import sys
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, ShortCircuitOperator
from datetime import datetime, timedelta
from decouple import config
import numpy as np
_work_dir = os.getcwd()
sys.path.insert(1, _work_dir)
from utils import pg_client
from utils import ch_client
from core.feedback import ConnectionHandler
from copy import copy
from sqlalchemy import text


execute_interval = config('EXECUTION_INTERVAL', default=24*60*60, cast=int)
features_table_name = config('FEATURES_TABLE_NAME', default='features_table')
host = config('pg_host_ml')
port = config('pg_port_ml')
user = config('pg_user_ml')
dbname = config('pg_dbname_ml')
password = config('pg_password_ml')
tracking_uri = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"

# 1702296756
def get_today_feedback():
    current_datetime = int((datetime.now()-timedelta(seconds=execute_interval)).timestamp())
    query = f"SELECT project_id, session_id, user_id as viewer_id, payload FROM recommendation_feedback WHERE insertion_time >= {current_datetime}"

    connection_handler = ConnectionHandler(tracking_uri)  # Connection to mlflow's database

    with connection_handler.get_live_session() as conn:
        cur = conn.execute(text(query))
        res = cur.fetchall()
        conn.commit()

    for i in range(len(res)):
        payload_i = res[i][3]
        res[i] = res[i][:3] + (payload_i['reason'], payload_i['comment'], payload_i['interesting'])

    df = pd.DataFrame(res, columns=["project_id", "session_id", "viewer_id", "reason", "comment", "interesting"])

    sessionsIds_list = df['session_id'].unique()
    sessionIds = ','.join([str(k) for k in sessionsIds_list])
    with ch_client.ClickHouseClient() as conn:
        query = f"""SELECT session_id, issue_type, count(1) as event_count FROM experimental.events WHERE session_id in ({sessionIds}) AND event_type = 'ISSUE' GROUP BY session_id, issue_type;"""
        res = conn.execute(query)

    df3 = pd.DataFrame(res)
    df3 = df3.pivot(index='session_id', columns=['issue_type'], values=['event_count']).event_count

    issues_type_found = df3.columns
    df[issues_type_found] = [[0] * len(issues_type_found)] * len(df)
    for sess in df3.index:
        tmp = copy(df[df['session_id'] == sess])
        tmp[issues_type_found] = [df3.loc[sess]] * len(tmp)
        df.loc[df['session_id'] == sess] = tmp

    asyncio.run(pg_client.init())  # Connection to OR postgres database
    with pg_client.PostgresClient() as conn:
        conn.execute("""SELECT T.project_id,
                                       T.session_id,
                                       T2.viewer_id,
                                       T.pages_count,
                                       T.events_count,
                                       T.errors_count,
                                       T.duration,
                                       T.country,
                                       T.issue_score,
                                       T.device_type,
                                       T2.replays,
                                       T2.network_access,
                                       T2.storage_access,
                                       T2.console_access,
                                       T2.stack_access
                                FROM (SELECT project_id,
                                             user_id                                                            as viewer_id,
                                             session_id,
                                             count(CASE WHEN source = 'replay' THEN 1 END) as replays,
                                             count(CASE WHEN source = 'network' THEN 1 END) as network_access,
                                             count(CASE WHEN source = 'storage' THEN 1 END) as storage_access,
                                             count(CASE WHEN source = 'console' THEN 1 END) as console_access,
                                             count(CASE WHEN source = 'stack_events' THEN 1 END) as stack_access
                                      FROM frontend_signals
                                      WHERE session_id IN ({sessionIds})
                                      GROUP BY project_id, viewer_id, session_id) as T2
                                         INNER JOIN (SELECT project_id,
                                                            session_id,
                                                            user_id,
                                                            pages_count,
                                                            events_count,
                                                            errors_count,
                                                            duration,
                                                            user_country     as country,
                                                            issue_score,
                                                            user_device_type as device_type
                                                     FROM sessions
                                                     WHERE session_id IN ({sessionIds})
                                                       AND duration IS NOT NULL) as T
                                                    USING (session_id);""".format(sessionIds=sessionIds)
                     )
        res = conn.fetchall()
    df2 = pd.DataFrame(res,
                       columns=["project_id", "session_id", "viewer_id", "pages_count", "events_count", "errors_count",
                                "duration", "country", "issue_score", "device_type", "replays", "network_access",
                                "storage_access", "console_access", "stack_access"])

    df2 = df.merge(df2, on=['session_id', 'project_id', 'viewer_id'], how='inner')
    for i in range(len(df2.columns)):
        if df2.dtypes[i] == np.float64:
            df2[df2.columns[i]] = df2[df2.columns[i]].astype('int')
    df2.fillna(0, inplace=True)

    ## Upload df2 to DB table

    base_query = f"""INSERT INTO {features_table_name} ({', '.join(df2.columns)}) VALUES """
    params = {}
    for i in range(len(df2)):
        template = '('
        for k, v in df2.iloc[i].items():
            try:
                params[f'{k}_{i}'] = v.item()
            except Exception:
                params[f'{k}_{i}'] = v
            template += f'%({k}_{i})s, '
        base_query += template[:-2] + '), '
    base_query = base_query[:-2]
    connection_handler = ConnectionHandler(tracking_uri)
    with connection_handler.get_live_session() as conn:
        cur = conn.connection().connection.cursor()
        query = cur.mogrify(base_query, params)
        conn.execute(text(query.decode("utf-8")))
        conn.commit()


def get_features_pg():
    ...


dag = DAG(
    "Feedback_DB_FILL",
    default_args={
        "retries": 1,
        "retry_delay": timedelta(minutes=3),
    },
    start_date=pendulum.datetime(2015, 12, 1, tz="UTC"),
    description="My first test",
    schedule=timedelta(seconds=execute_interval),
    catchup=False,
)

with dag:
    dag_t_feedback = PythonOperator(
        task_id='Get_Feedbacks',
        python_callable=get_today_feedback,
    )

    dag_features = PythonOperator(
        task_id='Update_DB',
        python_callable=get_features_pg,
    )

    dag_t_feedback >> dag_features
