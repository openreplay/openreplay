package env

import (
	"github.com/aws/aws-sdk-go/aws/ec2metadata"
	"crypto/tls"
	"log"
	"net/http"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/ec2rolecreds"
	_session "github.com/aws/aws-sdk-go/aws/session"
)

func AWSSessionOnRegion(region string) *_session.Session {
	// Initialize a metadata service, so we can check if metadata is available
	metadataConfig := &aws.Config{
		Region: aws.String(region),
	}
	metadata_session, err := _session.NewSession(metadataConfig)
	if err != nil {
		log.Printf("AWS session error: %v\n", err)
		log.Fatal("AWS session error")
	}
	metadata_service := ec2metadata.New(metadata_session, metadataConfig)

	var config *aws.Config

	AWS_ACCESS_KEY_ID := StringOptional("AWS_ACCESS_KEY_ID")
	AWS_SECRET_ACCESS_KEY := StringOptional("AWS_SECRET_ACCESS_KEY")
	if AWS_ACCESS_KEY_ID != "" && AWS_SECRET_ACCESS_KEY != "" {
		config = &aws.Config{
			Region:      aws.String(region),
			Credentials: credentials.NewStaticCredentials(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, ""),
		}
	} else if metadata_service.Available() {
		info, err := metadata_service.IAMInfo()
		if err != nil {
			log.Fatal("No IAM info from metadata service")
		}
		log.Printf("Instance profile ARN: %s", info.InstanceProfileArn)

		ec2roleprovider := ec2rolecreds.EC2RoleProvider{
			Client:       metadata_service,
			ExpiryWindow: 10,
		}
		cred, err := ec2roleprovider.Retrieve()
		if err != nil {
			log.Fatal("Could not retrieve role credentials")
		}
		log.Printf("Credentials Access Key Id: %s, provider %s", cred.AccessKeyID, cred.ProviderName)

		config = &aws.Config{
			Region:      aws.String(region),
			Credentials: ec2rolecreds.NewCredentialsWithClient(metadata_service),
		}
	} else {
		log.Fatal("No AWS credentials. No access key specified and no metadata service available.")
	}

	AWS_ENDPOINT := StringOptional("AWS_ENDPOINT")
	if AWS_ENDPOINT != "" {
		config.Endpoint = aws.String(AWS_ENDPOINT)
		config.DisableSSL = aws.Bool(true)
		config.S3ForcePathStyle = aws.Bool(true)

		AWS_SKIP_SSL_VALIDATION := Bool("AWS_SKIP_SSL_VALIDATION")
		if AWS_SKIP_SSL_VALIDATION {
			tr := &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			}
			client := &http.Client{Transport: tr}
			config.HTTPClient = client
		}
	}
	aws_session, err := _session.NewSession(config)
	if err != nil {
		log.Printf("AWS session error: %v\n", err)
		log.Fatal("AWS session error")
	}

	return aws_session
}
