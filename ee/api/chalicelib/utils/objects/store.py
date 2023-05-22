from decouple import config

from chalicelib.utils.objects.azure_blob import AzureBlobStorage
from chalicelib.utils.objects.s3 import AmazonS3Storage

# Init global object storage client
if config("CLOUD") == "azure":
    obj_store = AzureBlobStorage()
else:
    obj_store = AmazonS3Storage()
