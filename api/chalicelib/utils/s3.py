import hashlib
from urllib.parse import urlparse

import boto3
import botocore
from botocore.client import Config
from botocore.exceptions import ClientError
from decouple import config
from requests.models import PreparedRequest

if not config("S3_HOST", default=False):
    client = boto3.client('s3')
else:
    client = boto3.client('s3', endpoint_url=config("S3_HOST"),
                          aws_access_key_id=config("S3_KEY"),
                          aws_secret_access_key=config("S3_SECRET"),
                          config=Config(signature_version='s3v4'),
                          region_name=config("sessions_region"),
                          verify=not config("S3_DISABLE_SSL_VERIFY", default=False, cast=bool))


def __get_s3_resource():
    if not config("S3_HOST", default=False):
        return boto3.resource('s3')
    return boto3.resource('s3', endpoint_url=config("S3_HOST"),
                          aws_access_key_id=config("S3_KEY"),
                          aws_secret_access_key=config("S3_SECRET"),
                          config=Config(signature_version='s3v4'),
                          region_name=config("sessions_region"),
                          verify=not config("S3_DISABLE_SSL_VERIFY", default=False, cast=bool))


def exists(bucket, key):
    try:
        __get_s3_resource().Object(bucket, key).load()
    except botocore.exceptions.ClientError as e:
        if e.response['Error']['Code'] == "404":
            return False
        else:
            # Something else has gone wrong.
            raise
    return True


def get_presigned_url_for_sharing(bucket, expires_in, key, check_exists=False):
    if check_exists and not exists(bucket, key):
        return None

    return client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': bucket,
            'Key': key
        },
        ExpiresIn=expires_in
    )


def get_presigned_url_for_upload(bucket, expires_in, key, **args):
    return client.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': bucket,
            'Key': key
        },
        ExpiresIn=expires_in
    )


def get_presigned_url_for_upload_secure(bucket, expires_in, key, conditions=None, public=False, content_type=None):
    acl = 'private'
    if public:
        acl = 'public-read'
    fields = {"acl": acl}
    if content_type:
        fields["Content-Type"] = content_type
    url_parts = client.generate_presigned_post(
        Bucket=bucket,
        Key=key,
        ExpiresIn=expires_in,
        Fields=fields,
        Conditions=conditions,
    )
    req = PreparedRequest()
    req.prepare_url(
        f"{url_parts['url']}/{url_parts['fields']['key']}", url_parts['fields'])
    return req.url


def get_file(source_bucket, source_key):
    try:
        result = client.get_object(
            Bucket=source_bucket,
            Key=source_key
        )
    except ClientError as ex:
        if ex.response['Error']['Code'] == 'NoSuchKey':
            return None
        else:
            raise ex
    return result["Body"].read().decode()


def rename(source_bucket, source_key, target_bucket, target_key):
    s3 = __get_s3_resource()
    s3.Object(target_bucket, target_key).copy_from(
        CopySource=f'{source_bucket}/{source_key}')
    s3.Object(source_bucket, source_key).delete()


def tag_for_deletion(bucket, key):
    if not exists(bucket, key):
        return False
    tag_file(bucket=bucket, file_key=key, tag_key='to_delete_in_days', tag_value='7')


def generate_file_key(project_id, key):
    return f"{project_id}/{hashlib.md5(key.encode()).hexdigest()}"


def generate_file_key_from_url(project_id, url):
    u = urlparse(url)
    new_url = u.scheme + "://" + u.netloc + u.path
    return generate_file_key(project_id=project_id, key=new_url)


def tag_file(file_key, bucket, tag_key, tag_value):
    return client.put_object_tagging(
        Bucket=bucket,
        Key=file_key,
        Tagging={
            'TagSet': [
                {
                    'Key': tag_key,
                    'Value': tag_value
                },
            ]
        }
    )
