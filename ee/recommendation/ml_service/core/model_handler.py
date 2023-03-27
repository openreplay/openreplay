import mlflow
import hashlib


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
