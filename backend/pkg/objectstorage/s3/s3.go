package s3

import (
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	_session "github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"

	objConfig "openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/pkg/objectstorage"
)

const MAX_RETURNING_COUNT = 40

type storageImpl struct {
	uploader *s3manager.Uploader
	svc      *s3.S3
	bucket   *string
	fileTag  *string
}

func NewS3(cfg *objConfig.ObjectsConfig) (objectstorage.ObjectStorage, error) {
	if cfg == nil {
		return nil, fmt.Errorf("s3 config is nil")
	}
	config := &aws.Config{
		Region:      aws.String(cfg.AWSRegion),
		Credentials: credentials.NewStaticCredentials(cfg.AWSAccessKeyID, cfg.AWSSecretAccessKey, ""),
	}
	if cfg.AWSEndpoint != "" {
		config.Endpoint = aws.String(cfg.AWSEndpoint)
		config.DisableSSL = aws.Bool(true)
		config.S3ForcePathStyle = aws.Bool(true)

		if cfg.AWSSkipSSLValidation {
			tr := &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			}
			client := &http.Client{Transport: tr}
			config.HTTPClient = client
		}
	}
	sess, err := _session.NewSession(config)
	if err != nil {
		return nil, fmt.Errorf("AWS session error: %v", err)
	}
	return &storageImpl{
		uploader: s3manager.NewUploader(sess),
		svc:      s3.New(sess), // AWS Docs: "These clients are safe to use concurrently."
		bucket:   &cfg.BucketName,
		fileTag:  tagging(cfg.UseS3Tags),
	}, nil
}

func (s *storageImpl) Upload(reader io.Reader, key string, contentType, contentEncoding string, compression objectstorage.CompressionType) error {
	cacheControl := "max-age=2628000, immutable, private"
	var encoding *string
	switch compression {
	case objectstorage.Gzip:
		encodeStr := "gzip"
		encoding = &encodeStr
	case objectstorage.Brotli:
		encodeStr := "br"
		encoding = &encodeStr
	case objectstorage.Zstd:
		// Have to ignore contentEncoding for Zstd (otherwise will be an error in browser)
	}
	if contentEncoding != "" {
		encoding = &contentEncoding
	}

	_, err := s.uploader.Upload(&s3manager.UploadInput{
		Body:            reader,
		Bucket:          s.bucket,
		Key:             &key,
		ContentType:     &contentType,
		CacheControl:    &cacheControl,
		ContentEncoding: encoding,
		Tagging:         s.fileTag,
	})
	return err
}

func (s *storageImpl) Get(key string) (io.ReadCloser, error) {
	out, err := s.svc.GetObject(&s3.GetObjectInput{
		Bucket: s.bucket,
		Key:    &key,
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

func (s *storageImpl) GetAll(key string) ([]io.ReadCloser, error) {
	out, err := s.svc.GetObject(&s3.GetObjectInput{
		Bucket: s.bucket,
		Key:    &key,
	})
	if err != nil {
		return nil, err
	}
	return []io.ReadCloser{out.Body}, nil
}

func downloadS3Files(bucket, prefix string) {
	sess := _session.Must(_session.NewSession(&aws.Config{
		Region: aws.String("us-west-1"), // Change this to your region
	}))
	svc := s3.New(sess)

	resp, err := svc.ListObjects(&s3.ListObjectsInput{Bucket: &bucket, Prefix: &prefix})
	if err != nil {
		log.Fatal(err)
	}

	for _, item := range resp.Contents {
		file, err := os.Create(*item.Key)
		if err != nil {
			log.Fatal(err)
		}
		defer file.Close()

		downloader := s3manager.NewDownloader(sess)
		_, err = downloader.Download(file,
			&s3.GetObjectInput{
				Bucket: &bucket,
				Key:    item.Key,
			})
		if err != nil {
			log.Fatal(err)
		}
	}
}

func (s *storageImpl) Exists(key string) bool {
	_, err := s.svc.HeadObject(&s3.HeadObjectInput{
		Bucket: s.bucket,
		Key:    &key,
	})
	if err == nil {
		return true
	}
	return false
}

func (s *storageImpl) GetCreationTime(key string) *time.Time {
	ans, err := s.svc.HeadObject(&s3.HeadObjectInput{
		Bucket: s.bucket,
		Key:    &key,
	})
	if err != nil {
		return nil
	}
	return ans.LastModified
}

func (s *storageImpl) GetFrequentlyUsedKeys(projectID uint64) ([]string, error) {
	prefix := strconv.FormatUint(projectID, 10) + "/"
	output, err := s.svc.ListObjectsV2(&s3.ListObjectsV2Input{
		Bucket: s.bucket,
		Prefix: &prefix,
	})
	if err != nil {
		return nil, err
	}
	//pagination may be here

	list := output.Contents
	max := len(list)
	if max > MAX_RETURNING_COUNT {
		max = MAX_RETURNING_COUNT
		sort.Slice(list, func(i, j int) bool {
			return list[i].LastModified.After(*(list[j].LastModified))
		})
	}

	var keyList []string
	st := len(prefix)
	for _, obj := range list[:max] {
		keyList = append(keyList, (*obj.Key)[st:])
	}
	return keyList, nil
}

func (s *storageImpl) GetPreSignedUploadUrl(key string) (string, error) {
	req, _ := s.svc.PutObjectRequest(&s3.PutObjectInput{
		Bucket: aws.String(*s.bucket),
		Key:    aws.String(key),
	})
	urlStr, err := req.Presign(15 * time.Minute)
	if err != nil {
		return "", err
	}
	return urlStr, nil
}
