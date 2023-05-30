package azure

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"time"

	config "openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/pkg/objectstorage"

	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/blob"
)

type storageImpl struct {
	client    *azblob.Client
	container string
	tags      map[string]string
}

func NewStorage(cfg *config.ObjectsConfig) (objectstorage.ObjectStorage, error) {
	if cfg == nil {
		return nil, fmt.Errorf("azure config is empty")
	}
	cred, err := azblob.NewSharedKeyCredential(cfg.AzureAccountName, cfg.AzureAccountKey)
	if err != nil {
		return nil, fmt.Errorf("cannot create azure credential: %v", err)
	}
	client, err := azblob.NewClientWithSharedKeyCredential(fmt.Sprintf("https://%s.blob.core.windows.net/",
		cfg.AzureAccountName), cred, nil)
	if err != nil {
		return nil, fmt.Errorf("cannot create azure client: %v", err)
	}
	return &storageImpl{
		client:    client,
		container: cfg.BucketName,
		tags:      loadFileTag(),
	}, nil
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
	// Remove leading slash to avoid empty folder creation
	if strings.HasPrefix(key, "/") {
		key = key[1:]
	}
	_, err := s.client.UploadStream(context.Background(), s.container, key, reader, &azblob.UploadStreamOptions{
		HTTPHeaders: &blob.HTTPHeaders{
			BlobCacheControl:    &cacheControl,
			BlobContentEncoding: contentEncoding,
			BlobContentType:     &contentType,
		},
		Tags: s.tags,
	})
	return err
}

func (s *storageImpl) Get(key string) (io.ReadCloser, error) {
	ctx := context.Background()
	get, err := s.client.DownloadStream(ctx, s.container, key, nil)
	if err != nil {
		return nil, err
	}

	downloadedData := bytes.Buffer{}
	retryReader := get.NewRetryReader(ctx, &azblob.RetryReaderOptions{})
	_, err = downloadedData.ReadFrom(retryReader)
	if err != nil {
		return nil, err
	}

	err = retryReader.Close()
	return io.NopCloser(bytes.NewReader(downloadedData.Bytes())), err
}

func (s *storageImpl) Exists(key string) bool {
	ctx := context.Background()
	get, err := s.client.DownloadStream(ctx, s.container, key, nil)
	if err != nil {
		return false
	}
	if err := get.Body.Close(); err != nil {
		log.Println(err)
	}
	return true
}

func (s *storageImpl) GetCreationTime(key string) *time.Time {
	ctx := context.Background()
	get, err := s.client.DownloadStream(ctx, s.container, key, nil)
	if err != nil {
		return nil
	}
	if err := get.Body.Close(); err != nil {
		log.Println(err)
	}
	return get.LastModified
}

func loadFileTag() map[string]string {
	// Load file tag from env
	key := "retention"
	value := os.Getenv("RETENTION")
	if value == "" {
		value = "default"
	}
	return map[string]string{key: value}
}
