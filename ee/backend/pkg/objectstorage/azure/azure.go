package azure

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/blob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/sas"

	config "openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/pkg/objectstorage"
)

type storageImpl struct {
	client    *azblob.Client
	cred      *azblob.SharedKeyCredential
	container string
	account   string
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
		cred:      cred,
		container: cfg.BucketName,
		account:   cfg.AzureAccountName,
		tags:      loadFileTag(),
	}, nil
}

func (s *storageImpl) Upload(reader io.Reader, key string, contentType, contentEncoding string, compression objectstorage.CompressionType) error {
	cacheControl := "max-age=2628000, immutable, private"
	var encoding *string
	switch compression {
	case objectstorage.Gzip:
		gzipStr := "gzip"
		encoding = &gzipStr
	case objectstorage.Brotli:
		gzipStr := "br"
		encoding = &gzipStr
	}
	if contentEncoding != "" {
		encoding = &contentEncoding
	}
	// Remove leading slash to avoid empty folder creation
	if strings.HasPrefix(key, "/") {
		key = key[1:]
	}
	_, err := s.client.UploadStream(context.Background(), s.container, key, reader, &azblob.UploadStreamOptions{
		HTTPHeaders: &blob.HTTPHeaders{
			BlobCacheControl:    &cacheControl,
			BlobContentEncoding: encoding,
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

func (s *storageImpl) GetAll(key string) ([]io.ReadCloser, error) {
	return nil, errors.New("not implemented")
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

func (s *storageImpl) GetPreSignedUploadUrl(key string) (string, error) {
	// Set the desired SAS permissions and options for uploading
	sasQueryParams, err := sas.BlobSignatureValues{
		Protocol:      sas.ProtocolHTTPS,
		StartTime:     time.Now().UTC(),
		ExpiryTime:    time.Now().UTC().Add(time.Hour),
		Permissions:   to.Ptr(sas.BlobPermissions{Read: true, Create: true, Write: true, Tag: true}).String(),
		ContainerName: s.container,
		BlobName:      key,
	}.SignWithSharedKey(s.cred)
	if err != nil {
		return "", err
	}

	sasURL := fmt.Sprintf("https://%s.blob.core.windows.net/?%s", s.account, sasQueryParams.Encode())
	return sasURL, nil
}

func normalizeKey(key string) string {
	if strings.HasPrefix(key, "/") {
		key = key[1:]
	}
	return key
}

func (s *storageImpl) GetPreSignedDownloadUrl(key string) (string, error) {
	key = normalizeKey(key)

	// Read-only SAS for downloading
	qp, err := (sas.BlobSignatureValues{
		Protocol:      sas.ProtocolHTTPS,
		StartTime:     time.Now().UTC(),
		ExpiryTime:    time.Now().UTC().Add(time.Hour),
		Permissions:   to.Ptr(sas.BlobPermissions{Read: true}).String(),
		ContainerName: s.container,
		BlobName:      key,
	}).SignWithSharedKey(s.cred)
	if err != nil {
		return "", err
	}

	url := fmt.Sprintf("https://%s.blob.core.windows.net/%s/%s?%s",
		s.account, s.container, key, qp.Encode())
	return url, nil
}

func (s *storageImpl) GetPreSignedDownloadUrlFromBucket(bucket, key string) (string, error) {
	key = normalizeKey(key)

	qp, err := (sas.BlobSignatureValues{
		Protocol:      sas.ProtocolHTTPS,
		StartTime:     time.Now().UTC(),
		ExpiryTime:    time.Now().UTC().Add(time.Hour),
		Permissions:   to.Ptr(sas.BlobPermissions{Read: true}).String(),
		ContainerName: bucket,
		BlobName:      key,
	}).SignWithSharedKey(s.cred)
	if err != nil {
		return "", err
	}

	url := fmt.Sprintf("https://%s.blob.core.windows.net/%s/%s?%s",
		s.account, bucket, key, qp.Encode())
	return url, nil
}

func (s *storageImpl) Tag(fileKey, tagKey, tagValue string) error {
	fileKey = normalizeKey(fileKey)

	// Merge default tags with the provided one (override if same key)
	tags := map[string]string{tagKey: tagValue}
	for k, v := range s.tags {
		if _, exists := tags[k]; !exists {
			tags[k] = v
		}
	}

	// Build blob URL and use blob.Client for SetTags
	blobURL := fmt.Sprintf("https://%s.blob.core.windows.net/%s/%s", s.account, s.container, fileKey)
	bc, err := blob.NewClientWithSharedKeyCredential(blobURL, s.cred, nil)
	if err != nil {
		return err
	}

	_, err = bc.SetTags(context.Background(), tags, nil)
	return err
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
