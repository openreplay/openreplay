from chalicelib.utils.helper import environ
from chalicelib.utils.s3 import client
from chalicelib.utils import s3


def get_web(sessionId):
    return client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': environ["sessions_bucket"],
            'Key': sessionId
        },
        ExpiresIn=100000
    )


def get_ios(sessionId):
    return client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': environ["ios_bucket"],
            'Key': sessionId
        },
        ExpiresIn=100000
    )


def delete_mobs(session_ids):
    for session_id in session_ids:
        s3.schedule_for_deletion(environ["sessions_bucket"], session_id)
