from decouple import config

from chalicelib.utils import s3


def tag_session(file_key, tag_key='retention', tag_value='vault'):
    return tag_file(file_key=file_key, bucket=config("sessions_bucket"), tag_key=tag_key, tag_value=tag_value)


def tag_record(file_key, tag_key='retention', tag_value='vault'):
    return tag_file(file_key=file_key, bucket=config('ASSIST_RECORDS_BUCKET'), tag_key=tag_key, tag_value=tag_value)


def tag_file(file_key, bucket, tag_key, tag_value):
    return s3.client.put_object_tagging(
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
