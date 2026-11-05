import boto3
import botocore
from botocore.client import Config
from botocore.exceptions import ClientError
from decouple import config
from requests.models import PreparedRequest
from chalicelib.utils.storage.interface import ObjectStorage


class AmazonS3Storage(ObjectStorage):
    if not config("S3_HOST", default=False):
        client = boto3.client('s3')
        resource = boto3.resource('s3')
    else:
        client = boto3.client('s3', endpoint_url=config("S3_HOST"),
                              aws_access_key_id=config("S3_KEY"),
                              aws_secret_access_key=config("S3_SECRET"),
                              config=Config(signature_version='s3v4'),
                              region_name=config("sessions_region"),
                              verify=not config("S3_DISABLE_SSL_VERIFY", default=False, cast=bool))
        resource = boto3.resource('s3', endpoint_url=config("S3_HOST"),
                                  aws_access_key_id=config("S3_KEY"),
                                  aws_secret_access_key=config("S3_SECRET"),
                                  config=Config(signature_version='s3v4'),
                                  region_name=config("sessions_region"),
                                  verify=not config("S3_DISABLE_SSL_VERIFY", default=False, cast=bool))

    def exists(self, bucket, key):
        try:
            self.resource.Object(bucket, key).load()
        except botocore.exceptions.ClientError as e:
            if e.response['Error']['Code'] == "404":
                return False
            else:
                # Something else has gone wrong.
                raise
        return True

    def get_presigned_url_for_sharing(self, bucket, expires_in, key, check_exists=False):
        if check_exists and not self.exists(bucket, key):
            return None

        return self.client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket,
                'Key': key
            },
            ExpiresIn=expires_in
        )

    def get_presigned_url_for_upload(self, bucket, expires_in, key, **args):
        return self.client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket,
                'Key': key
            },
            ExpiresIn=expires_in
        )

    def get_presigned_url_for_upload_secure(self, bucket, expires_in, key, conditions=None, public=False,
                                            content_type=None):
        acl = 'private'
        if public:
            acl = 'public-read'
        fields = {"acl": acl}
        if content_type:
            fields["Content-Type"] = content_type
        url_parts = self.client.generate_presigned_post(
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

    def get_file(self, source_bucket, source_key):
        try:
            result = self.client.get_object(
                Bucket=source_bucket,
                Key=source_key
            )
        except ClientError as ex:
            if ex.response['Error']['Code'] == 'NoSuchKey':
                return None
            else:
                raise ex
        return result["Body"].read().decode()

    def tag_for_deletion(self, bucket, key):
        if not self.exists(bucket, key):
            return False
        # Copy the file to change the creation date, so it can be deleted X days after the tag's creation
        s3_target = self.resource.Object(bucket, key)
        s3_target.copy_from(
            CopySource={'Bucket': bucket, 'Key': key},
            MetadataDirective='COPY',
            TaggingDirective='COPY'
        )

        self.tag_file(bucket=bucket, file_key=key, tag_key='to_delete_in_days',
                      tag_value=config("SCH_DELETE_DAYS", default='7'))

    def tag_file(self, file_key, bucket, tag_key, tag_value):
        return self.client.put_object_tagging(
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
