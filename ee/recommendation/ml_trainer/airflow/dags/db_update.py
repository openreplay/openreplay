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
_work_dir = os.getcwd()
sys.path.insert(1, _work_dir)
from utils import pg_client
from utils import ch_client
from core.feedback import ConnectionHandler
from sqlalchemy import text


execute_interval = config('EXECUTION_INTERVAL', default=24*60*60, cast=int)
features_table_name = config('FEATURES_TABLE_NAME', default='features_table')
host = config('pg_host_ml')
port = config('pg_port_ml')
user = config('pg_user_ml')
dbname = config('pg_dbname_ml')
password = config('pg_password_ml')
tracking_uri = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"


def get_today_feedback():
    connection_handler = ConnectionHandler(tracking_uri)

    with connection_handler.get_live_session() as conn:
        cur = conn.connection().connection.cursor()
        query = cur.mogrify(
            f"""SELECT project_id, session_id, user_id as viewer_id, payload FROM recommendation_feedback WHERE insertion_time > %(time_lower_bound)s;""",
            {'time_lower_bound': int(datetime.now().timestamp()) - execute_interval})
        cur = conn.execute(text(query.decode("utf-8")))
        res = cur.fetchall()
        conn.commit()

    for i in range(len(res)):
        payload_i = res[i][3]
        res[i] = res[i][:3] + (payload_i['reason'], payload_i['comment'], payload_i['interesting'])

    df = pd.DataFrame(res, columns=["project_id", "session_id", "viewer_id", "reason", "comment", "interesting"])

    sessionIds = ','.join([str(k) for k in df['session_id'].unique()])

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
                                "storage_access", "console_access", "stack_acces"])

    df2 = df.merge(df2, on=['session_id', 'project_id', 'viewer_id'], how='inner')

    ## Upload df2 to DB table

    base_query = f"""INSERT INTO {features_table_name} (project_id, session_id, viewer_id, reason, comment, interesting, pages_count, events_count,
           issues_count, duration, country, issue_score, device_type,
           replays, network_access, storage_access, console_access,
           stack_access) VALUES """
    params = {}
    for i in range(len(df2)):
        template = '('
        for k, v in df2.iloc[i].items():
            params[f'{k}_{i}'] = v.values[0]
            template += f's({k}_{i})%'
        base_query += template + '), '
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
