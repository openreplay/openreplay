package s3

import (
	"io"
	"net/url"
	"openreplay/backend/pkg/objectstorage"
	"os"
	"sort"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"

	"openreplay/backend/pkg/env"
)

type storageImpl struct {
	uploader *s3manager.Uploader
	svc      *s3.S3
	bucket   *string
	fileTag  string
	useTags  bool
}

func NewS3(region string, bucket string, useTags bool) objectstorage.ObjectStorage {
	sess := env.AWSSessionOnRegion(region)
	return &storageImpl{
		uploader: s3manager.NewUploader(sess),
		svc:      s3.New(sess), // AWS Docs: "These clients are safe to use concurrently."
		bucket:   &bucket,
		fileTag:  loadFileTag(),
		useTags:  useTags,
	}
}

func (s *storageImpl) tagging() *string {
	if s.useTags {
		return &s.fileTag
	}
	return nil
}

func (s *storageImpl) Upload(reader io.Reader, key string, contentType string, compression objectstorage.CompressionType) error {
	cacheControl := "max-age=2628000, immutable, private"
	var contentEncoding *string
	switch compression {
	case objectstorage.Gzip:
		gzipStr := "gzip"
		contentEncoding = &gzipStr
	case objectstorage.Brotli:
		gzipStr := "br"
		contentEncoding = &gzipStr
	}

	_, err := s.uploader.Upload(&s3manager.UploadInput{
		Body:            reader,
		Bucket:          s.bucket,
		Key:             &key,
		ContentType:     &contentType,
		CacheControl:    &cacheControl,
		ContentEncoding: contentEncoding,
		Tagging:         s.tagging(),
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

const MAX_RETURNING_COUNT = 40

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
