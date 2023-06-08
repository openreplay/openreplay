from decouple import config

from chalicelib.utils.objects.azure_blob import AzureBlobStorage
from chalicelib.utils.objects.s3 import AmazonS3Storage

# Init global object storage client
if config("CLOUD") == "azure":
    StorageClient = AzureBlobStorage()
else:
    StorageClient = AmazonS3Storage()
