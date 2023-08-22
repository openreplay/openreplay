package videostorage

import (
	"fmt"
	config "openreplay/backend/internal/config/videostorage"
	"openreplay/backend/pkg/objectstorage"
)

type VideoStorage struct {
	cfg        *config.Config
	objStorage objectstorage.ObjectStorage
}

func New(cfg *config.Config, objStorage objectstorage.ObjectStorage) (*VideoStorage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case objStorage == nil:
		return nil, fmt.Errorf("object storage is empty")
	}
	newStorage := &VideoStorage{
		cfg:        cfg,
		objStorage: objStorage,
	}
	return newStorage, nil
}

func (v *VideoStorage) Process(sessID uint64) error {
	/*
		1. Download Several Archives from S3 Folder
		2. Untar Archives into One Folder
		3. Convert JPEG Files to MP4 Video
	*/
	files, err := v.objStorage.GetAll(sessID)
	if err != nil {
		return err
	}
	// TODO: untar files
	// TODO: convert to mp4 (ffmpeg)
	// TODO: upload to s3 resulted video
	return nil
}

func (v *VideoStorage) Wait() {
	return
}
