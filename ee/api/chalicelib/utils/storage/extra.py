from decouple import config
from chalicelib.utils.storage import StorageClient


def tag_session(file_key, tag_key='retention', tag_value='vault'):
    bucket = config("sessions_bucket")
    if not StorageClient.exists(bucket=bucket, key=file_key):
        return None
    return StorageClient.tag_file(file_key=file_key, bucket=bucket, tag_key=tag_key, tag_value=tag_value)


def tag_record(file_key, tag_key='retention', tag_value='vault'):
    bucket = config('ASSIST_RECORDS_BUCKET')
    if not StorageClient.exists(bucket=bucket, key=file_key):
        return None
    return StorageClient.tag_file(file_key=file_key, bucket=bucket, tag_key=tag_key, tag_value=tag_value)