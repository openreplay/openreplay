package objectstorage

// Object storage configuration

type ObjectsConfig struct {
	ServiceName          string `env:"SERVICE_NAME,required"`
	CloudName            string `env:"CLOUD,default=aws"`
	BucketName           string `env:"BUCKET_NAME,required"`
	AWSRegion            string `env:"AWS_REGION"`
	AWSAccessKeyID       string `env:"AWS_ACCESS_KEY_ID"`
	AWSSecretAccessKey   string `env:"AWS_SECRET_ACCESS_KEY"`
	AWSEndpoint          string `env:"AWS_ENDPOINT"`
	AWSSkipSSLValidation bool   `env:"AWS_SKIP_SSL_VALIDATION"`
	AzureAccountName     string `env:"AZURE_ACCOUNT_NAME"`
	AzureAccountKey      string `env:"AZURE_ACCOUNT_KEY"`
}

func (c *ObjectsConfig) UseFileTags() bool {
	return c.CloudName != "azure"
}
