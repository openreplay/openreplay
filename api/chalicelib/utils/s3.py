from botocore.exceptions import ClientError
from decouple import config
from datetime import datetime, timedelta
import boto3
import botocore
from botocore.client import Config

if not config("S3_HOST", default=False):
    client = boto3.client('s3')
else:
    client = boto3.client('s3', endpoint_url=config("S3_HOST"),
                          aws_access_key_id=config("S3_KEY"),
                          aws_secret_access_key=config("S3_SECRET"),
                          config=Config(signature_version='s3v4'),
                          region_name=config("sessions_region"))


def __get_s3_resource():
    if not config("S3_HOST", default=False):
        return boto3.resource('s3')
    return boto3.resource('s3', endpoint_url=config("S3_HOST"),
                          aws_access_key_id=config("S3_KEY"),
                          aws_secret_access_key=config("S3_SECRET"),
                          config=Config(signature_version='s3v4'),
                          region_name=config("sessions_region"))


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


def get_presigned_url_for_upload(bucket, expires_in, key):
    return client.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': bucket,
            'Key': key
        },
        ExpiresIn=expires_in
    )


def get_file(source_bucket, source_key):
    try:
        result = client.get_object(
            Bucket=source_bucket,
            Key=source_key
        )
    except ClientError as ex:
        if ex.response['Error']['Code'] == 'NoSuchKey':
            print(f'======> No object found - returning None for \nbucket:{source_bucket}\nkey:{source_key}')
            return None
        else:
            raise ex
    return result["Body"].read().decode()


def rename(source_bucket, source_key, target_bucket, target_key):
    s3 = __get_s3_resource()
    s3.Object(target_bucket, target_key).copy_from(CopySource=f'{source_bucket}/{source_key}')
    s3.Object(source_bucket, source_key).delete()


def schedule_for_deletion(bucket, key):
    s3 = __get_s3_resource()
    s3_object = s3.Object(bucket, key)
    s3_object.copy_from(CopySource={'Bucket': bucket, 'Key': key},
                        Expires=datetime.now() + timedelta(days=7),
                        MetadataDirective='REPLACE')
