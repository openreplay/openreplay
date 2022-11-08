from decouple import config

from chalicelib.utils.s3 import client


def tag_file(session_id, tag_key='retention', tag_value='vault'):
    return client.put_object_tagging(
        Bucket=config("sessions_bucket"),
        Key=session_id,
        Tagging={
            'TagSet': [
                {
                    'Key': tag_key,
                    'Value': tag_value
                },
            ]
        }
    )
