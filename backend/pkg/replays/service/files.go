package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	config "openreplay/backend/internal/config/session"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/canvas"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
)

type Files interface {
	GetMobsUrls(sessID uint64) ([]string, error)
	GetDevtoolsUrls(sessID uint64) ([]string, error)
	GetMobStartUrl(sessID uint64) ([]string, error)
	GetCanvasUrls(sessID uint64) ([]string, error)
	GetMobileReplayUrls(sessID uint64) ([]string, error)
	GetUnprocessedMob(sessID uint64) (string, error)
	GetUnprocessedDevtools(sessID uint64) (string, error)
	GetFileKey(sessID uint64) (*string, error)
}

const (
	MOBS_BUCKET          = "mobs"
	CANVASES_BUCKET      = "mobs"
	UNPROCESSED_MAX_SIZE = 200 * 1000
)

type filesImpl struct {
	log      logger.Logger
	cfg      *config.Config
	objStore objectstorage.ObjectStorage
	canvases canvas.Canvases
}

func New(log logger.Logger, cfg *config.Config, objStore objectstorage.ObjectStorage, canvases canvas.Canvases) (Files, error) {
	switch {
	case log == nil:
		return nil, errors.New("nil logger")
	case objStore == nil:
		return nil, errors.New("nil object storage")
	case canvases == nil:
		return nil, errors.New("nil canvases")
	}
	if !unprocessedPathAccessible(log, cfg.FSDir) {
		return nil, errors.New("unprocessed path is not accessible")
	}
	return &filesImpl{
		log:      log,
		cfg:      cfg,
		objStore: objStore,
		canvases: canvases,
	}, nil
}

func unprocessedPathAccessible(log logger.Logger, path string) bool {
	f, err := os.Open(path)
	if err != nil {
		log.Error(context.Background(), err.Error())
		return false
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		log.Error(context.Background(), err.Error())
		return false
	}
	if !info.IsDir() {
		log.Error(context.Background(), "path is not a directory")
		return false
	}
	_, err = f.Readdir(1)
	if err != nil && !errors.Is(err, io.EOF) {
		log.Error(context.Background(), err.Error())
		return false
	}
	return true
}

func (f *filesImpl) GetMobsUrls(sessID uint64) ([]string, error) {
	key := fmt.Sprintf("%d%s", sessID, string(storage.DOM))
	doms, err := f.objStore.GetPreSignedDownloadUrlFromBucket(MOBS_BUCKET, key+"s")
	if err != nil {
		return nil, err
	}
	dome, err := f.objStore.GetPreSignedDownloadUrlFromBucket(MOBS_BUCKET, key+"e")
	if err != nil {
		return nil, err
	}
	return []string{doms, dome}, nil
}

func (f *filesImpl) GetDevtoolsUrls(sessID uint64) ([]string, error) {
	key := fmt.Sprintf("%d%s", sessID, string(storage.DEV))
	dev, err := f.objStore.GetPreSignedDownloadUrlFromBucket(MOBS_BUCKET, key)
	if err != nil {
		return nil, err
	}
	return []string{dev}, nil
}

func (f *filesImpl) GetMobStartUrl(sessID uint64) ([]string, error) {
	key := fmt.Sprintf("%d%s", sessID, string(storage.DOM))
	doms, err := f.objStore.GetPreSignedDownloadUrlFromBucket(MOBS_BUCKET, key+"s")
	if err != nil {
		return nil, err
	}
	return []string{doms}, nil
}

func (f *filesImpl) GetCanvasUrls(sessID uint64) ([]string, error) {
	recIDs, err := f.canvases.Get(sessID)
	if err != nil {
		return nil, err
	}
	res := make([]string, 0, len(recIDs))
	for _, recID := range recIDs {
		url, err := f.objStore.GetPreSignedDownloadUrlFromBucket(CANVASES_BUCKET, fmt.Sprintf("%d/%s.tar.zst", sessID, recID))
		if err != nil {
			return nil, err
		}
		res = append(res, url)
	}
	return res, nil
}

func (f *filesImpl) GetMobileReplayUrls(sessID uint64) ([]string, error) {
	key := fmt.Sprintf("%d/replay.tar.zst", sessID)
	video, err := f.objStore.GetPreSignedDownloadUrlFromBucket(MOBS_BUCKET, key)
	if err != nil {
		return nil, err
	}
	return []string{video}, nil
}

func (f *filesImpl) GetUnprocessedMob(sessID uint64) (string, error) {
	return GetRawMobByID(f.cfg.FSDir, fmt.Sprintf("%d", sessID))
}

func (f *filesImpl) GetUnprocessedDevtools(sessID uint64) (string, error) {
	return GetRawMobByID(f.cfg.FSDir, fmt.Sprintf("%ddevtools", sessID))
}

func GetRawMobByID(efsPath, file string) (string, error) {
	pathToFile := filepath.Join(efsPath, file)

	info, err := os.Stat(pathToFile)
	if err != nil {
		return "", err
	}
	sizeKB := info.Size() / 1000

	maxKB := UNPROCESSED_MAX_SIZE
	if int(sizeKB) >= maxKB {
		return "", errors.New(fmt.Sprintf("file size is too big: %d", sizeKB))
	}

	return pathToFile, nil
}

func (f *filesImpl) GetFileKey(sessID uint64) (*string, error) {
	return nil, nil
}
