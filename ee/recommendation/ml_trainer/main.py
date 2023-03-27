import mlflow
import hashlib
import argparse
from decouple import config
from datetime import datetime
from core.user_features import get_training_database
from core.recommendation_model import SVM_recommendation

mlflow.set_tracking_uri(config('MLFLOW_TRACKING_URI'))


def main(experiment_name, projectId, tenantId):
    hashed = hashlib.sha256(bytes(f'{projectId}-{tenantId}'.encode('utf-8'))).hexdigest()
    x, y, d = get_training_database(projectId, max_timestamp=1679672171284, favorites=True)
    train_balance = y.sum() / len(y)
    print(f'Train data shape: {x.shape}, Data balance (1/all): {train_balance}')
    if x.shape[0] <= 7:
        return
    if train_balance < 0.4 or train_balance > 0.6:
        return
    _experiment = mlflow.get_experiment_by_name(experiment_name)
    if _experiment is None:
        artifact_uri = config('MODELS_S3_BUCKET', default='./mlruns')
        mlflow.create_experiment(experiment_name, artifact_uri)
    mlflow.set_experiment(experiment_name)
    with mlflow.start_run(run_name=f'{hashed}-{datetime.now().strftime("%Y-%M-%d_%H:%m")}'):
        reg_model_name = f"{hashed}-RecModel"
        best_meta = {'score': 0, 'model': None, 'name': 'NoName'}
        for kernel in ['linear', 'poly', 'rbf', 'sigmoid']:
            with mlflow.start_run(run_name=f'sub_run_with_{kernel}', nested=True):
                print("--")
                model = SVM_recommendation(kernel=kernel, test=True)
                #mlflow.sklearn.autolog(silent=True)
                model.fit(x, y)
                mlflow.sklearn.log_model(model, "sk_learn",
                                         serialization_format="cloudpickle")
                mlflow.log_param("kernel", kernel)
                mlflow.log_metric("score", model.score)
                for _name, displ in model.plots().items():
                    mlflow.log_figure(displ, f'{_name}.png')
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
    import asyncio
    import os
    os.environ['PG_POOL'] = 'true'
    from utils import pg_client

    asyncio.run(pg_client.init())
    parser = argparse.ArgumentParser(
        prog='Recommandation Trainer',
        description='This python script aims to create a model able to predict which sessions may be most interesting to replay for the users',
    )
    parser.add_argument('--projects', type=int, nargs='+')
    parser.add_argument('--tenants', type=int, nargs='+')

    args = parser.parse_args()

    projects = args.projects
    tenants = args.tenants

    for i in range(len(projects)):
        print(f'Processing project {projects[i]}...')
        main(experiment_name='s3-recommendations', projectId=projects[i], tenantId=tenants[i])
    asyncio.run(pg_client.terminate())
