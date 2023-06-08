from decouple import config

from .azure_blob import AzureBlobStorage
from .s3 import AmazonS3Storage

# Init global object storage client
if config("CLOUD") == "azure":
    StorageClient = AzureBlobStorage()
else:
    StorageClient = AmazonS3Storage()
