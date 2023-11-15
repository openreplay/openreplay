import mlflow
import hashlib
import numpy as np
from decouple import config
from utils import pg_client
from utils.df_utils import _process_pg_response
from time import time

host = config('pg_host_ml')
port = config('pg_port_ml')
user = config('pg_user_ml')
dbname = config('pg_dbname_ml')
password = config('pg_password_ml')

tracking_uri = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
mlflow.set_tracking_uri(tracking_uri)
batch_download_size = config('batch_download_size', default=10, cast=int)


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

    def load_model(self, model_name, model_version=1):
        """Load model from mlflow given the model version.
        Params:
            model_name: model name in mlflow repository
            model_version: version of model to be downloaded"""
        self.model = mlflow.pyfunc.load_model(f'models:/{model_name}/{model_version}')

    def predict(self, X) -> np.ndarray:
        """Make prediction for batch X."""
        assert self.model is not None, 'Model has to be loaded before predicting. See load_model.__doc__'
        return self.model.predict(X)

    def _sort_by_recommendation(self, sessions, sessions_features) -> np.ndarray:
        """Make prediction for sessions_features and sort them by relevance."""
        pred = self.predict(sessions_features)
        threshold = config('threshold_prediction', default=0.6, cast=float)
        over_threshold = pred > threshold
        pred = pred[over_threshold]
        if len(pred) == 0:
            return np.array([])
        sorted_idx = np.argsort(pred)[::-1]
        return sessions[over_threshold][sorted_idx]

    def get_recommendations(self, userId, projectId):
        """Gets recommendations for userId for a given projectId.
        Selects last unseen_selection_limit non seen sessions (env value, default 100)
        and sort them by pertinence using ML model"""
        limit = config('unseen_selection_limit', default=100, cast=int)
        oldest_limit = 1000*(time() - config('unseen_max_days_ago_selection', default=30, cast=int)*60*60*24)
        with pg_client.PostgresClient() as conn:
            query = conn.mogrify(
                """SELECT project_id, session_id, user_id, %(userId)s as viewer_id, events_count, errors_count, duration, user_country as country, issue_score, user_device_type as device_type
                    FROM sessions
                    WHERE project_id = %(projectId)s AND session_id NOT IN (SELECT session_id FROM user_viewed_sessions WHERE user_id = %(userId)s) AND duration > 10000 AND start_ts > %(oldest_limit)s LIMIT %(limit)s""",
                {'userId': userId, 'projectId': projectId, 'limit': limit, 'oldest_limit': oldest_limit}
            )
            conn.execute(query)
            res = conn.fetchall()
        _X = list()
        _Y = list()
        X_project_ids = dict()
        X_users_ids = dict()
        X_sessions_ids = dict()
        _process_pg_response(res, _X, _Y, X_project_ids, X_users_ids, X_sessions_ids, label=0)

        return self._sort_by_recommendation(np.array(list(X_sessions_ids.keys())), _X).tolist()


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
            self.to_download.append((name, version))
            # self.download_model(name, version)
        self.names = new_names

    async def download_next(self):
        """Pop element from to_download, download and add it into models."""
        download_loop_number = 0
        if self.to_download:
            while download_loop_number < batch_download_size:
                try:
                    name, version = self.to_download.pop(0)
                    s_model = ServedModel()
                    s_model.load_model(name, version)
                    self.models[name] = s_model
                    download_loop_number += 1
                except IndexError:
                    break
                except Exception as e:
                    print('[Error] Found exception')
                    print(repr(e))
                    break

    def download_model(self, name, version):
        model = ServedModel()
        model.load_model(name, version)
        self.models[name] = model

    def info(self):
        """Show current loaded models."""
        print('Current models inside:')
        for model_name, model in self.models.items():
            print('Name:', model_name)
            print(model.model)

    def get_recommendations(self, userId, projectId, n_recommendations=5):
        """Gets recommendation for userId given the projectId.
        This method selects the corresponding model and gets recommended sessions ordered by relevance."""
        tenantId = get_tenant(projectId)
        hashed = hashlib.sha256(bytes(f'{projectId}-{tenantId}'.encode('utf-8'))).hexdigest()
        model_name = f'{hashed}-RecModel'
        n_recommendations = config('number_of_recommendations', default=5, cast=int)
        try:
            model = self.models[model_name]
        except KeyError:
            return []
        return model.get_recommendations(userId, projectId)[:n_recommendations]


recommendation_model = Recommendations()
