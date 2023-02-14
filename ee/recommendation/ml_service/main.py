import mlflow
from queue import Queue

import numpy as np
from decouple import config
from core.session_features import get_training_database
import requests

host = config('pg_host_ml')
port = config('pg_port_ml')
user = config('pg_user_ml')
dbname = config('pg_dbname_ml')
password = config('pg_password_ml')

tracking_uri = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
mlflow.set_tracking_uri(tracking_uri)


class ServedModel:
    def __init__(self):
        self.model = None
        self.queue = Queue(maxsize=config('queue_maxsize', default=20))

    def load_model(self, model_name, model_version=1):
        self.model = mlflow.pyfunc.load_model(f'models:/{model_name}/{model_version}')

    def predict(self):
        _X = list()
        while not self.queue.empty():
            _X.append(self.queue.get())
        return self.model.predict(_X)

    def sort_by_recommendation(self, sessions, sessions_features):
        pred = self.predict(sessions_features)
        sorted_idx = np.argsort(pred, reversed=True)
        return sessions[sorted_idx]

    def get_recommendations(self, user_id, project_id):
        pass


if __name__ == '__main__':
    x, y, d = get_training_database()

    host = '0.0.0.0'
    port = '8001'

    url = f'http://{host}:{port}/invocations'

    headers = {
        'Content-Type': 'application/json',
    }

    # test_data is a Pandas dataframe with data for testing the ML model
    http_data = test_data.to_json(orient='split')

    r = requests.post(url=url, headers=headers, data=http_data)

    print(f'Predictions: {r.text}')
