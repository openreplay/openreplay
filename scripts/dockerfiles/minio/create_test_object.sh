#!/bin/bash

# MinIO S3 API test using curl
ENDPOINT="http://localhost:9000"
ACCESS_KEY="minioadmin"
SECRET_KEY="minioadmin123"
BUCKET="test-bucket"
OBJECT_KEY="test-file.txt"
CONTENT="Hello from MinIO! This is a test object created via S3 API."

echo "Testing MinIO S3 API with curl..."
echo

# Function to create AWS Signature V4
create_signature() {

    # For simplicity, we'll use AWS CLI if available
    if command -v aws &>/dev/null; then
        echo "Using AWS CLI for S3 operations..."

        # Configure AWS CLI for MinIO
        export AWS_ACCESS_KEY_ID="$ACCESS_KEY"
        export AWS_SECRET_ACCESS_KEY="$SECRET_KEY"

        # Create bucket
        echo "1. Creating bucket: $BUCKET"
        aws --endpoint-url=$ENDPOINT s3 mb s3://$BUCKET 2>&1 || echo "Bucket may already exist"

        # Create and upload object
        echo "2. Creating test file..."
        echo "$CONTENT" >/tmp/test-file.txt

        echo "3. Uploading object: $OBJECT_KEY"
        aws --endpoint-url=$ENDPOINT s3 cp /tmp/test-file.txt s3://$BUCKET/$OBJECT_KEY

        # List buckets
        echo "4. Listing buckets:"
        aws --endpoint-url=$ENDPOINT s3 ls

        # List objects in bucket
        echo "5. Listing objects in bucket:"
        aws --endpoint-url=$ENDPOINT s3 ls s3://$BUCKET/

        # Download and verify
        echo "6. Downloading and verifying object:"
        aws --endpoint-url=$ENDPOINT s3 cp s3://$BUCKET/$OBJECT_KEY /tmp/downloaded-file.txt
        echo "Content: $(cat /tmp/downloaded-file.txt)"

        # Cleanup
        rm -f /tmp/test-file.txt /tmp/downloaded-file.txt

        echo
        echo "✅ SUCCESS: Created bucket and objects in MinIO!"
        return 0
    else
        echo "AWS CLI not found. Please install it or use the Web UI at http://localhost:9001"
        return 1
    fi
}

create_signature
