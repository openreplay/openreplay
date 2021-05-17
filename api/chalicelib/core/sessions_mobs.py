from chalicelib.utils.helper import environ

import boto3


def get_web(sessionId):
    return boto3.client('s3', region_name=environ["sessions_region"]).generate_presigned_url(
        'get_object',
        Params={
            'Bucket': environ["sessions_bucket"],
            'Key': sessionId
        },
        ExpiresIn=100000
    )


def get_ios(sessionId):
    return boto3.client('s3', region_name=environ["ios_region"]).generate_presigned_url(
        'get_object',
        Params={
            'Bucket': environ["ios_bucket"],
            'Key': sessionId
        },
        ExpiresIn=100000
    )
