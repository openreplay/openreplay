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
	if cfg.CloudName == "azure" {
		return azure.NewStorage(cfg)
	}
	return s3.NewS3(cfg)
}
