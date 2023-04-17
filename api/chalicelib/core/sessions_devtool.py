from decouple import config

from chalicelib.utils import s3


def __get_devtools_keys(project_id, session_id):
    params = {
        "sessionId": session_id,
        "projectId": project_id
    }
    return [
        config("DEVTOOLS_MOB_PATTERN", default="%(sessionId)sdevtools") % params
    ]


def get_urls(session_id, project_id, check_existence: bool = True):
    results = []
    for k in __get_devtools_keys(project_id=project_id, session_id=session_id):
        if check_existence and not s3.exists(bucket=config("sessions_bucket"), key=k):
            continue
        results.append(s3.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': config("sessions_bucket"), 'Key': k},
            ExpiresIn=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900)
        ))
    return results


def delete_mobs(project_id, session_ids):
    for session_id in session_ids:
        for k in __get_devtools_keys(project_id=project_id, session_id=session_id):
            s3.tag_for_deletion(bucket=config("sessions_bucket"), key=k)
