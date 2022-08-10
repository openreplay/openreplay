package env

import (
	"crypto/tls"
	"log"
	"net/http"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	_session "github.com/aws/aws-sdk-go/aws/session"
)

func AWSSessionOnRegion(region string) *_session.Session {
	AWS_ACCESS_KEY_ID := String("AWS_ACCESS_KEY_ID")
	AWS_SECRET_ACCESS_KEY := String("AWS_SECRET_ACCESS_KEY")
	config := &aws.Config{
		Region:      aws.String(region),
		Credentials: credentials.NewStaticCredentials(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, ""),
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
