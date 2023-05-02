from decouple import config

from chalicelib.utils import s3


def __get_mob_keys(project_id, session_id):
    params = {
        "sessionId": session_id,
        "projectId": project_id
    }
    return [
        config("SESSION_MOB_PATTERN_S", default="%(sessionId)s") % params,
        config("SESSION_MOB_PATTERN_E", default="%(sessionId)se") % params
    ]


def __get_mob_keys_deprecated(session_id):
    return [str(session_id), str(session_id) + "e"]


def get_urls(project_id, session_id, check_existence: bool = True):
    results = []
    for k in __get_mob_keys(project_id=project_id, session_id=session_id):
        if check_existence and not s3.exists(bucket=config("sessions_bucket"), key=k):
            continue
        results.append(s3.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': config("sessions_bucket"), 'Key': k},
            ExpiresIn=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900)
        ))
    return results


def get_urls_depercated(session_id, check_existence: bool = True):
    results = []
    for k in __get_mob_keys_deprecated(session_id=session_id):
        if check_existence and not s3.exists(bucket=config("sessions_bucket"), key=k):
            continue
        results.append(s3.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': config("sessions_bucket"), 'Key': k},
            ExpiresIn=100000
        ))
    return results


def get_ios(session_id):
    return s3.client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': config("ios_bucket"),
            'Key': str(session_id)
        },
        ExpiresIn=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900)
    )


def delete_mobs(project_id, session_ids):
    for session_id in session_ids:
        for k in __get_mob_keys(project_id=project_id, session_id=session_id) \
                 + __get_mob_keys_deprecated(session_id=session_id):
            s3.tag_for_deletion(bucket=config("sessions_bucket"), key=k)
