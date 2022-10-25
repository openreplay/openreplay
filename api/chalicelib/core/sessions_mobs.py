from decouple import config

from chalicelib.utils import s3
from chalicelib.utils.s3 import client


def __get_mob_keys(project_id, session_id):
    params = {
        "sessionId": session_id,
        "projectId": project_id
    }
    return [
        config("SESSION_MOB_PATTERN_S", default="%(sessionId)s") % params,
        config("SESSION_MOB_PATTERN_E", default="%(sessionId)se") % params
    ]


def get_urls(project_id, session_id):
    results = []
    for k in __get_mob_keys(project_id=project_id, session_id=session_id):
        results.append(client.generate_presigned_url(
            'get_object',
            Params={'Bucket': config("sessions_bucket"), 'Key': k},
            ExpiresIn=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900)
        ))
    return results


def get_urls_depercated(session_id):
    return [
        client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': config("sessions_bucket"),
                'Key': str(session_id)
            },
            ExpiresIn=100000
        ),
        client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': config("sessions_bucket"),
                'Key': str(session_id) + "e"
            },
            ExpiresIn=100000
        )]


def get_ios(session_id):
    return client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': config("ios_bucket"),
            'Key': str(session_id)
        },
        ExpiresIn=config("PRESIGNED_URL_EXPIRATION", cast=int, default=900)
    )


def delete_mobs(project_id, session_ids):
    for session_id in session_ids:
        for k in __get_mob_keys(project_id=project_id, session_id=session_id):
            s3.schedule_for_deletion(config("sessions_bucket"), k)
