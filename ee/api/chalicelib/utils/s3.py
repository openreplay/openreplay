from botocore.exceptions import ClientError
from chalicelib.utils.helper import environ

import boto3

import botocore
from botocore.client import Config

client = boto3.client('s3', endpoint_url=environ["S3_HOST"],
                      aws_access_key_id=environ["S3_KEY"],
                      aws_secret_access_key=environ["S3_SECRET"],
                      config=Config(signature_version='s3v4'),
                      region_name='us-east-1')


def exists(bucket, key):
    try:
        boto3.resource('s3', endpoint_url=environ["S3_HOST"],
                       aws_access_key_id=environ["S3_KEY"],
                       aws_secret_access_key=environ["S3_SECRET"],
                       config=Config(signature_version='s3v4'),
                       region_name='us-east-1') \
            .Object(bucket, key).load()
    except botocore.exceptions.ClientError as e:
        if e.response['Error']['Code'] == "404":
            return False
        else:
            # Something else has gone wrong.
            raise
    return True
