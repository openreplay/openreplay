import mlflow
from datetime import date
from decouple import config
from core.session_features import get_training_database
from core.recommendation_model import SVM_recommendation

mlflow.set_tracking_uri(config('MLFLOW_TRACKING_URI'))


def main(experiment_name):
    x, y, d = get_training_database()
    artifact_uri = config('MODELS_S3_BUCKET', default='./mlruns')
    mlflow.create_experiment(experiment_name, artifact_uri)
    mlflow.set_experiment(experiment_name)
    with mlflow.start_run(run_name=f'experiment-{date.today().strftime("%Y-%M-%d_%H:%m")}'):
        reg_model_name = "SVM"
        best_meta = {'score': 0, 'model': None, 'name': 'NoName'}
        for kernel in ['linear', 'poly', 'rbf', 'sigmoid']:
            with mlflow.start_run(run_name=f'sub_run_with_{kernel}', nested=True):
                print("--")
                model = SVM_recommendation(kernel=kernel, test=True)
                mlflow.sklearn.autolog()
                model.fit(x, y)
                mlflow.log_param("kernel", kernel)
                mlflow.log_metric("score", model.score)
                if model.score > best_meta['score']:
                    best_meta['score'] = model.score
                    best_meta['model'] = model
                    best_meta['name'] = kernel
        mlflow.log_metric("score", best_meta['score'])
        mlflow.log_param("name", best_meta['name'])
        mlflow.sklearn.log_model(best_meta['model'], "sk_learn",
                                 serialization_format="cloudpickle",
                                 registered_model_name=reg_model_name,
                                 )


if __name__ == '__main__':
    main(experiment_name='s3-recommendations')
