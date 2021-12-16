from decouple import config

from chalicelib.utils import s3
from chalicelib.utils.s3 import client


def get_web(sessionId):
    return client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': config("sessions_bucket"),
            'Key': str(sessionId)
        },
        ExpiresIn=100000
    )


def get_ios(sessionId):
    return client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': config("ios_bucket"),
            'Key': str(sessionId)
        },
        ExpiresIn=100000
    )


def delete_mobs(session_ids):
    for session_id in session_ids:
        s3.schedule_for_deletion(config("sessions_bucket"), session_id)
