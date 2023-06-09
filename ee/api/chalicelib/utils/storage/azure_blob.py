from decouple import config
from datetime import datetime, timedelta
from chalicelib.utils.storage.interface import ObjectStorage
from azure.storage.blob import BlobServiceClient, BlobSasPermissions, generate_blob_sas


class AzureBlobStorage(ObjectStorage):
    client = None

    def __init__(self):
        # Prepare blob storage client
        self.client = BlobServiceClient(
            account_url=f"https://{config('AZURE_ACCOUNT_NAME')}.blob.core.windows.net",
            credential=config("AZURE_ACCOUNT_KEY"),
        )

    def exists(self, bucket, key):
        return self.client.get_blob_client(bucket, key).exists()

    def get_presigned_url_for_sharing(self, bucket, expires_in, key, check_exists=False):
        blob_client = self.client.get_blob_client(bucket, key)
        if check_exists and not blob_client.exists():
            return None

        blob_sas = generate_blob_sas(account_name=config("AZURE_ACCOUNT_NAME"),
                                     container_name=bucket,
                                     blob_name=key,
                                     account_key=config("AZURE_ACCOUNT_KEY"),
                                     permission=BlobSasPermissions(read=True),
                                     expiry=datetime.utcnow() + timedelta(seconds=expires_in),
                                     )
        return f"https://{config('AZURE_ACCOUNT_NAME')}.blob.core.windows.net/{bucket}/{key}?{blob_sas}"

    def get_presigned_url_for_upload(self, bucket, expires_in, key, **args):
        blob_sas = generate_blob_sas(account_name=config("AZURE_ACCOUNT_NAME"),
                                     container_name=bucket,
                                     blob_name=key,
                                     account_key=config("AZURE_ACCOUNT_KEY"),
                                     permission=BlobSasPermissions(write=True),
                                     expiry=datetime.utcnow() + timedelta(seconds=expires_in),
                                     )
        return f"https://{config('AZURE_ACCOUNT_NAME')}.blob.core.windows.net/{bucket}/{key}?{blob_sas}"

    def get_file(self, source_bucket, source_key):
        blob_client = self.client.get_blob_client(source_bucket, source_key)
        return blob_client.download_blob().readall()

    def tag_for_deletion(self, bucket, key):
        blob_client = self.client.get_blob_client(bucket, key)
        if not blob_client.exists():
            return False
        blob_tags = blob_client.get_blob_tags()
        blob_client.start_copy_from_url(
            source_url=f"https://{config('AZURE_ACCOUNT_NAME')}.blob.core.windows.net/{bucket}/{key}",
            requires_sync=True,
        )
        blob_tags["to_delete_in_days"] = config("SCH_DELETE_DAYS", default='7')
        blob_client.set_blob_tags(blob_tags)
