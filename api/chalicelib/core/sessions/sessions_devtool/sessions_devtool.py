from decouple import config

from chalicelib.utils.storage import StorageClient


def get_devtools_keys(project_id, session_id):
    params = {
        "sessionId": session_id,
        "projectId": project_id
    }
    return [
        config("DEVTOOLS_MOB_PATTERN", default="%(sessionId)sdevtools") % params
    ]


def delete_mobs(project_id, session_ids):
    for session_id in session_ids:
        for k in get_devtools_keys(project_id=project_id, session_id=session_id):
            StorageClient.tag_for_deletion(bucket=config("sessions_bucket"), key=k)
