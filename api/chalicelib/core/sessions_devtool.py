from decouple import config

from chalicelib.utils.storage import StorageClient


def __get_devtools_keys(project_id, session_id):
    params = {
        "sessionId": session_id,
        "projectId": project_id
    }
    return [
        config("DEVTOOLS_MOB_PATTERN", default="%(sessionId)sdevtools") % params
    ]


async def get_urls(session_id, project_id, check_existence: bool = True):
    results = []
    for k in __get_devtools_keys(project_id=project_id, session_id=session_id):
        if check_existence and not await StorageClient.exists(bucket=config("sessions_bucket"), key=k):
            continue
        results.append(await StorageClient.get_presigned_url_for_sharing(
            bucket=config("sessions_bucket"),
            expires_in=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900),
            key=k
        ))
    return results


async def delete_mobs(project_id, session_ids):
    for session_id in session_ids:
        for k in __get_devtools_keys(project_id=project_id, session_id=session_id):
            await StorageClient.tag_for_deletion(bucket=config("sessions_bucket"), key=k)
