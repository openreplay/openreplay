package store

import (
	"errors"
	objConfig "openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/azure"
	"openreplay/backend/pkg/objectstorage/s3"
)

func NewStore(cfg *objConfig.ObjectsConfig) (objectstorage.ObjectStorage, error) {
	if cfg == nil {
		return nil, errors.New("object storage config is empty")
	}
	// Return azure implementation
	if cfg.CloudName == "azure" {
		return azure.NewStorage(cfg)
	}
	// Return s3 implementation
	switch cfg.ServiceName {
	case "assets":
		return s3.NewS3(cfg.AWSRegion, cfg.S3BucketAssets, cfg.UseFileTags())
	case "storage":
		return s3.NewS3(cfg.S3Region, cfg.S3Bucket, cfg.UseFileTags())
	default:
		return nil, errors.New("unknown object storage service name")
	}
}
