import asyncio
import hashlib
import mlflow
import os
import pendulum
import sys
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, ShortCircuitOperator
from datetime import timedelta
from decouple import config
from textwrap import dedent
_work_dir = os.getcwd()
sys.path.insert(1, _work_dir)
from utils import pg_client


client = mlflow.MlflowClient()
models = [model.name for model in client.search_registered_models()]


def split_training(ti):
    global models
    projects = ti.xcom_pull(key='project_data').split(' ')
    tenants = ti.xcom_pull(key='tenant_data').split(' ')
    new_projects = list()
    old_projects = list()
    new_tenants = list()
    old_tenants = list()
    for i in range(len(projects)):
        hashed = hashlib.sha256(bytes(f'{projects[i]}-{tenants[i]}'.encode('utf-8'))).hexdigest()
        _model_name = f'{hashed}-RecModel'
        if _model_name in models:
            old_projects.append(projects[i])
            old_tenants.append(tenants[i])
        else:
            new_projects.append(projects[i])
            new_tenants.append(tenants[i])
    ti.xcom_push(key='new_project_data', value=' '.join(new_projects))
    ti.xcom_push(key='new_tenant_data', value=' '.join(new_tenants))
    ti.xcom_push(key='old_project_data', value=' '.join(old_projects))
    ti.xcom_push(key='old_tenant_data', value=' '.join(old_tenants))


def continue_new(ti):
    L = ti.xcom_pull(key='new_project_data')
    return len(L) > 0


def continue_old(ti):
    L = ti.xcom_pull(key='old_project_data')
    return len(L) > 0


def select_from_db(ti):
    os.environ['PG_POOL'] = 'true'
    asyncio.run(pg_client.init())
    with pg_client.PostgresClient() as conn:
        conn.execute("""SELECT tenant_id, project_id as project_id
                        FROM ((SELECT project_id
                               FROM frontend_signals
                               GROUP BY project_id
                               HAVING count(1) > 10) AS T1
                            INNER JOIN projects AS T2 USING (project_id));""")
        res = conn.fetchall()
    projects = list()
    tenants = list()
    for e in res:
        projects.append(str(e['project_id']))
        tenants.append(str(e['tenant_id']))
    asyncio.run(pg_client.terminate())
    ti.xcom_push(key='project_data', value=' '.join(projects))
    ti.xcom_push(key='tenant_data', value=' '.join(tenants))


dag = DAG(
    "first_test",
    default_args={
        "retries": 1,
        "retry_delay": timedelta(minutes=3),
    },
    start_date=pendulum.datetime(2015, 12, 1, tz="UTC"),
    description="My first test",
    schedule=config('crons_train', default='@weekly'),
    catchup=False,
)

# assigning the task for our dag to do
with dag:
    split = PythonOperator(
        task_id='Split_Create_and_Retrain',
        provide_context=True,
        python_callable=split_training,
        do_xcom_push=True
    )

    select_vp = PythonOperator(
        task_id='Select_Valid_Projects',
        provide_context=True,
        python_callable=select_from_db,
        do_xcom_push=True
    )

    dag_split1 = ShortCircuitOperator(
        task_id='Create_Condition',
        python_callable=continue_new,
    )

    dag_split2 = ShortCircuitOperator(
        task_id='Retrain_Condition',
        python_callable=continue_old,
    )

    new_models = BashOperator(
        task_id='Create_Models',
        bash_command=f"python {_work_dir}/main.py " + "--projects {{task_instance.xcom_pull(task_ids='Split_Create_and_Retrain', key='new_project_data')}} " +
                     "--tenants {{task_instance.xcom_pull(task_ids='Split_Create_and_Retrain', key='new_tenant_data')}}",
    )

    old_models = BashOperator(
        task_id='Retrain_Models',
        bash_command=f"python {_work_dir}/main.py " + "--projects {{task_instance.xcom_pull(task_ids='Split_Create_and_Retrain', key='old_project_data')}} " +
                     "--tenants {{task_instance.xcom_pull(task_ids='Split_Create_and_Retrain', key='old_tenant_data')}}",
    )

    select_vp >> split >> [dag_split1, dag_split2]
    dag_split1 >> new_models
    dag_split2 >> old_models
