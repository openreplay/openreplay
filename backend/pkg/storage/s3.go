package storage

import (
	"io"
	"net/url"
	"os"
	"sort"
	"strconv"
	"time"

	_s3 "github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"

	"openreplay/backend/pkg/env"
)

type S3 struct {
	uploader *s3manager.Uploader
	svc      *_s3.S3
	bucket   *string
	fileTag  string
	useTags  bool
}

func NewS3(region string, bucket string, useTags bool) *S3 {
	sess := env.AWSSessionOnRegion(region)
	return &S3{
		uploader: s3manager.NewUploader(sess),
		svc:      _s3.New(sess), // AWS Docs: "These clients are safe to use concurrently."
		bucket:   &bucket,
		fileTag:  loadFileTag(),
		useTags:  useTags,
	}
}

type CompressionType int

const (
	NoCompression CompressionType = iota
	Gzip
	Brotli
)

func (s3 *S3) tagging() *string {
	if s3.useTags {
		return &s3.fileTag
	}
	return nil
}

func (s3 *S3) Upload(reader io.Reader, key string, contentType string, compression CompressionType) error {
	cacheControl := "max-age=2628000, immutable, private"
	var contentEncoding *string
	switch compression {
	case Gzip:
		gzipStr := "gzip"
		contentEncoding = &gzipStr
	case Brotli:
		gzipStr := "br"
		contentEncoding = &gzipStr
	}

	_, err := s3.uploader.Upload(&s3manager.UploadInput{
		Body:            reader,
		Bucket:          s3.bucket,
		Key:             &key,
		ContentType:     &contentType,
		CacheControl:    &cacheControl,
		ContentEncoding: contentEncoding,
		Tagging:         s3.tagging(),
	})
	return err
}

func (s3 *S3) Get(key string) (io.ReadCloser, error) {
	out, err := s3.svc.GetObject(&_s3.GetObjectInput{
		Bucket: s3.bucket,
		Key:    &key,
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

func (s3 *S3) Exists(key string) bool {
	_, err := s3.svc.HeadObject(&_s3.HeadObjectInput{
		Bucket: s3.bucket,
		Key:    &key,
	})
	if err == nil {
		return true
	}
	return false
}

func (s3 *S3) GetCreationTime(key string) *time.Time {
	ans, err := s3.svc.HeadObject(&_s3.HeadObjectInput{
		Bucket: s3.bucket,
		Key:    &key,
	})
	if err != nil {
		return nil
	}
	return ans.LastModified
}

const MAX_RETURNING_COUNT = 40

func (s3 *S3) GetFrequentlyUsedKeys(projectID uint64) ([]string, error) {
	prefix := strconv.FormatUint(projectID, 10) + "/"
	output, err := s3.svc.ListObjectsV2(&_s3.ListObjectsV2Input{
		Bucket: s3.bucket,
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
	s := len(prefix)
	for _, obj := range list[:max] {
		keyList = append(keyList, (*obj.Key)[s:])
	}
	return keyList, nil
}

func loadFileTag() string {
	// Load file tag from env
	key := "retention"
	value := os.Getenv("RETENTION")
	if value == "" {
		value = "default"
	}
	// Create URL encoded tag set for file
	params := url.Values{}
	params.Add(key, value)
	return params.Encode()
}
