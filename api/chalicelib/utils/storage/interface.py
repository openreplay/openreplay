from abc import ABC, abstractmethod


class ObjectStorage(ABC):
    @abstractmethod
    def exists(self, bucket, key):
        # Returns True if the object exists in the bucket, False otherwise
        pass

    @abstractmethod
    def get_file(self, source_bucket, source_key):
        # Download and returns the file contents as bytes
        pass

    @abstractmethod
    def get_presigned_url_for_sharing(self, bucket, expires_in, key, check_exists=False):
        # Returns a pre-signed URL for downloading the file from the object storage
        pass

    @abstractmethod
    def get_presigned_url_for_upload(self, bucket, expires_in, key, **args):
        # Returns a pre-signed URL for uploading the file to the object storage
        pass

    @abstractmethod
    def tag_for_deletion(self, bucket, key):
        # Adds the special tag 'to_delete_in_days' to the file to mark it for deletion
        pass
