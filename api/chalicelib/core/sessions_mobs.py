from chalicelib.utils.helper import environ
from chalicelib.utils.s3 import client


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


def prefix_mobs(session_ids, prefix_with):
    for session_id in session_ids:
        client.rename(
            environ["sessions_bucket"], session_id,
            environ["sessions_bucket"], prefix_with + session_id
        )
