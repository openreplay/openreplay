import mlflow
import hashlib
import argparse
import numpy as np
from decouple import config
from datetime import datetime,timedelta
from core.user_features import get_training_database
from core.recommendation_model import SVM_recommendation, sort_database

mlflow.set_tracking_uri(config('MLFLOW_TRACKING_URI'))


def handle_database(x_train, y_train):
    """
    Verifies if database is well-balanced. If not and if possible fixes it.
    """
    total = len(y_train)
    if total < 13:
        return None, None
    train_balance = y_train.sum() / total
    if train_balance < 0.4:
        positives = y_train[y_train == 1]
        n_positives = len(positives)
        x_positive = x_train[y_train == 1]
        if n_positives < 7:
            return None, None
        else:
            n_negatives_expected = min(int(n_positives/0.4), total-y_train.sum())
            negatives = y_train[y_train == 0][:n_negatives_expected]
            x_negative = x_train[y_train == 0][:n_negatives_expected]
            return np.concatenate((x_positive, x_negative), axis=0), np.concatenate((negatives, positives), axis=0)
    elif train_balance > 0.6:
        negatives = y_train[y_train == 0]
        n_negatives = len(negatives)
        x_negative = x_train[y_train == 0]
        if n_negatives < 7:
            return None, None
        else:
            n_positives_expected = min(int(n_negatives / 0.4), y_train.sum())
            positives = y_train[y_train == 1][:n_positives_expected]
            x_positive = x_train[y_train == 1][:n_positives_expected]
            return np.concatenate((x_positive, x_negative), axis=0), np.concatenate((negatives, positives), axis=0)
    else:
        return x_train, y_train


def main(experiment_name, projectId, tenantId):
    """
    Main training method using mlflow for tracking and s3 for stocking.
    Params:
        experiment_name: experiment name for mlflow repo.
        projectId: project id of sessions.
        tenantId: tenant of the project id (used mainly as salt for hashing).
    """
    hashed = hashlib.sha256(bytes(f'{projectId}-{tenantId}'.encode('utf-8'))).hexdigest()
    x_, y_, d = get_training_database(projectId, max_timestamp=int((datetime.now() - timedelta(days=1)).timestamp()), favorites=True)

    x, y = handle_database(x_, y_)
    if x is None:
        print(f'[INFO] Project {projectId}: Not enough data to train model - {y_.sum()}/{len(y_)-y_.sum()}')
        return
    x, y = sort_database(x, y)

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
                model.fit(x, y)
                mlflow.sklearn.log_model(model, "sk_learn",
                                         serialization_format="cloudpickle")
                mlflow.log_param("kernel", kernel)
                mlflow.log_metric("score", model.score)
                for _name, displ in model.plots().items():
                    #TODO: Close displays not to overload memory
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
