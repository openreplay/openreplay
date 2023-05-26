package objectstorage

// Object storage configuration

type ObjectsConfig struct {
	ServiceName string `env:"SERVICE_NAME,required"`
	CloudName   string `env:"CLOUD,default=aws"`
	// S3 storage configuration
	S3Region string `env:"AWS_REGION_WEB"`
	S3Bucket string `env:"S3_BUCKET_WEB"`
	// TEMP
	AWSRegion      string `env:"AWS_REGION"`
	S3BucketAssets string `env:"S3_BUCKET_ASSETS"`
	// Azure Blob Storage configuration
	AzureAccountName string `env:"AZURE_ACCOUNT_NAME,required"`
	AzureAccountKey  string `env:"AZURE_ACCOUNT_KEY,required"`
	AzureBucket      string `env:"AZURE_BUCKET,required"`
}

func (c *ObjectsConfig) UseFileTags() bool {
	return c.CloudName != "azure"
}
