from chalicelib.utils.s3 import client
from decouple import config

def tag_file( session_id, tag_key='retention', tag_value='vault'):
    return client.put_object_tagging(
        Bucket=config("sessions_bucket"),
        Key=session_id,
        # VersionId='string',
        # ContentMD5='string',
        # ChecksumAlgorithm='CRC32'|'CRC32C'|'SHA1'|'SHA256',
        Tagging={
            'TagSet': [
                {
                    'Key': tag_key,
                    'Value': tag_value
                },
            ]
        },
        # ExpectedBucketOwner='string',
        # RequestPayer='requester'
    )

    # generate_presigned_url(
    #     'put_object',
    #     Params={
    #         'Bucket': bucket,
    #         'Key': key
    #     },
    #     ExpiresIn=expires_in
    # )
