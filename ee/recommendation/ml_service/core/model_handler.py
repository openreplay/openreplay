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
        """Handler of mlflow model."""
        self.model = None
        self.queue = Queue(maxsize=config('queue_maxsize', default=20))

    def load_model(self, model_name, model_version=1):
        """Load model from mlflow given the model version."""
        self.model = mlflow.pyfunc.load_model(f'models:/{model_name}/{model_version}')

    def predict(self, X):
        """Make prediction for batch X."""
        return self.model.predict(X)

    def sort_by_recommendation(self, sessions, sessions_features):
        """Make prediction for sessions_features and sort them by relevance."""
        pred = self.predict(sessions_features)
        if len(pred) == 0:
            return []
        sorted_idx = np.argsort(pred)[::-1]
        return sessions[sorted_idx]

    def get_recommendations(self, userId, projectId):
        """Gets recommendations for userId for a given projectId.
        Selects last unseen_selection_limit non seen sessions (env value, default 100)
        and sort them by pertinence using ML model"""
        limit = config('unseen_selection_limit', default=100, cast=int)
        with pg_client.PostgresClient() as conn:
            query = conn.mogrify(
                """SELECT project_id, session_id, user_id, %(userId)s as viewer_id, events_count, errors_count, duration, user_country as country, issue_score, user_device_type as device_type
                    FROM sessions
                    WHERE project_id = %(projectId)s AND session_id NOT IN (SELECT session_id FROM user_viewed_sessions) AND duration IS NOT NULL LIMIT {limit}""",
                {'userId': userId, 'projectId': projectId, 'limit': limit}
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


class Recommendations:
    def __init__(self):
        """Handler for multiple models.
        Properties:
            * names [dict]: names of current available models and its versions (model name as key).
            * models [dict]: ServedModels objects (model name as key).
            * to_download [list]: list of model name and version to be downloaded from mlflow server (in s3).
        """
        self.names = dict()
        self.models = dict()
        self.to_download = list()

    async def update(self):
        """Fill to_download list with new models or new version for saved models."""
        r_models = mlflow.search_registered_models()
        new_names = {m.name: max(m.latest_versions).version for m in r_models}
        for name, version in new_names.items():
            if (name, version) in self.names.items():
                continue
            #self.to_download.append((name, version))
            self.download_model(name, version)
        self.names = new_names

    async def download_next(self):
        """Pop element from to_download, download and add it into models."""
        if self.to_download:
            name, version = self.to_download.pop(0)
            s_model = ServedModel()
            s_model.load_model(name, version)
            self.models[name] = s_model

    def download_model(self, name, version):
        model = ServedModel()
        self.models[name] = model.load_model(name, version)

    def info(self):
        """Show current loaded models."""
        print('Current models inside:')
        for model_name, model in self.models.items():
            print('Name:', model_name)
            print(model.model)

    def get_recommendations(self, userId, projectId):
        """Gets recommendation for userId given the projectId.
        This method selects the corresponding model and gets recommended sessions ordered by relevance."""
        tenantId = get_tenant(projectId)
        hashed = hashlib.sha256(bytes(f'{projectId}-{tenantId}'.encode('utf-8'))).hexdigest()
        model_name = f'{hashed}-RecModel'
        try:
            model = self.models[model_name]
        except KeyError:
            return []
        return model.get_recommendations(userId, projectId)


recommendation_model = Recommendations()
