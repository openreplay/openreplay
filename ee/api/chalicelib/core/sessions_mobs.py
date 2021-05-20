from chalicelib.utils import helper
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
