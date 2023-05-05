import mlflow
import hashlib
from queue import Queue
import numpy as np
from decouple import config
from utils import pg_client
from utils.df_utils import _process_pg_response
# from core.session_features import get_training_database
# import requests

host = config('pg_host_ml')
port = config('pg_port_ml')
user = config('pg_user_ml')
dbname = config('pg_dbname_ml')
password = config('pg_password_ml')

tracking_uri = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
mlflow.set_tracking_uri(tracking_uri)


def get_latest_uri(projectId, tenantId):
    client = mlflow.MlflowClient()
    hashed = hashlib.sha256(bytes(f'{projectId}-{tenantId}'.encode('utf-8'))).hexdigest()
    model_name = f'{hashed}-RecModel'
    model_versions = client.search_model_versions(f"name='{model_name}'")
    latest = -1
    for i in range(len(model_versions)):
        _v = model_versions[i].version
        if _v < latest:
            continue
        else:
            latest = _v
    return f"runs:/{model_name}/{latest}"


def get_tenant(projectId):
    with pg_client.PostgresClient() as conn:
        conn.execute(
            conn.mogrify("SELECT tenant_id FROM projects WHERE project_id=%(projectId)s", {'projectId': projectId})
        )
        res = conn.fetchone()
    return res['tenant_id']


class ServedModel:
    def __init__(self):
        self.model = None
        self.queue = Queue(maxsize=config('queue_maxsize', default=20))

    def load_model(self, model_name, model_version=1):
        self.model = mlflow.pyfunc.load_model(f'models:/{model_name}/{model_version}')

    def predict(self, X):
        return self.model.predict(X)

    def sort_by_recommendation(self, sessions, sessions_features):
        pred = self.predict(sessions_features)
        sorted_idx = np.argsort(pred)[::-1]
        return sessions[sorted_idx]

    def get_recommendations(self, userId, projectId):
        with pg_client.PostgresClient() as conn:
            query = conn.mogrify(
                """SELECT project_id, session_id, user_id, %(userId)s as viewer_id, events_count, errors_count, duration, user_country as country, issue_score, user_device_type as device_type
                    FROM sessions
                    WHERE project_id = %(projectId)s AND session_id NOT IN (SELECT session_id FROM user_viewed_sessions) AND duration IS NOT NULL LIMIT 100""",
                {'userId': userId, 'projectId': projectId}
            )
            conn.execute(query)
            res = conn.fetchall()
        _X = list()
        _Y = list()
        X_project_ids = dict()
        X_users_ids = dict()
        X_sessions_ids = dict()
        _process_pg_response(res, _X, _Y, X_project_ids, X_users_ids, X_sessions_ids, label=0)

        return self.sort_by_recommendation(np.array(list(X_sessions_ids.keys())), _X)
        #return self.model.predict(_X)


class Recommendations:
    def __init__(self):
        self.names = dict()
        self.models = dict()
        self.update()

    def update(self):
        r_models = mlflow.search_registered_models()
        new_names = {m.name: max(m.latest_versions).version for m in r_models}
        for name, version in new_names.items():
            if (name, version) in self.names.items():
                continue
            s_model = ServedModel()
            s_model.load_model(name, version)
            self.models[name] = s_model
        self.names = new_names

    def info(self):
        print('Current models inside:')
        for model_name, model in self.models.items():
            print('Name:', model_name)
            print(model.model)

    def get_recommendations(self, userId, projectId):
        tenantId = get_tenant(projectId)
        hashed = hashlib.sha256(bytes(f'{projectId}-{tenantId}'.encode('utf-8'))).hexdigest()
        model_name = f'{hashed}-RecModel'
        try:
            model = self.models[model_name]
        except KeyError:
            return None
        return model.get_recommendations(userId, projectId)


recommendation_model = Recommendations()
