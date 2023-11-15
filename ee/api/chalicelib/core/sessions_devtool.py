from decouple import config
from fastapi.security import SecurityScopes

import schemas
from chalicelib.core import permissions
from chalicelib.utils.storage import StorageClient

SCOPES = SecurityScopes([schemas.Permissions.dev_tools])


def __get_devtools_keys(project_id, session_id):
    params = {
        "sessionId": session_id,
        "projectId": project_id
    }
    return [
        config("DEVTOOLS_MOB_PATTERN", default="%(sessionId)sdevtools") % params
    ]


def get_urls(session_id, project_id, context: schemas.CurrentContext, check_existence: bool = True):
    if not permissions.check(security_scopes=SCOPES, context=context):
        return []
    results = []
    for k in __get_devtools_keys(project_id=project_id, session_id=session_id):
        if check_existence and not StorageClient.exists(bucket=config("sessions_bucket"), key=k):
            continue
        results.append(StorageClient.get_presigned_url_for_sharing(
            bucket=config("sessions_bucket"),
            expires_in=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900),
            key=k
        ))
    return results


def delete_mobs(project_id, session_ids):
    for session_id in session_ids:
        for k in __get_devtools_keys(project_id=project_id, session_id=session_id):
            StorageClient.tag_for_deletion(bucket=config("sessions_bucket"), key=k)
