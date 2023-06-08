package store

import (
	"errors"
	objConfig "openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/s3"
)

func NewStore(cfg *objConfig.ObjectsConfig) (objectstorage.ObjectStorage, error) {
	if cfg == nil {
		return nil, errors.New("object storage config is empty")
	}
	return s3.NewS3(cfg)
}
