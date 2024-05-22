package connector

import (
	"context"
	"fmt"

	"openreplay/backend/internal/config/connector"
	"openreplay/backend/pkg/logger"
)

type S3Storage struct {
	log     logger.Logger
	cfg     *connector.Config
	ctx     context.Context
	batches *Batches
}

func NewS3Storage(log logger.Logger, cfg *connector.Config, buckets *Batches) (*S3Storage, error) {
	return &S3Storage{
		log:     log,
		cfg:     cfg,
		ctx:     context.Background(),
		batches: buckets,
	}, nil
}

func (ds *S3Storage) InsertSessions(batch []map[string]string) error {
	fileName := generateName(ds.cfg.SessionsTableName)
	if err := ds.batches.Insert(batch, fileName, sessionColumns); err != nil {
		return fmt.Errorf("can't insert sessions batch: %s", err)
	}
	ds.log.Info(context.Background(), "sessions batch of %d sessions is successfully saved", len(batch))
	return nil
}

func (ds *S3Storage) InsertEvents(batch []map[string]string) error {
	fileName := generateName(ds.cfg.EventsTableName)
	if err := ds.batches.Insert(batch, fileName, eventColumns); err != nil {
		return fmt.Errorf("can't insert events batch: %s", err)
	}
	ds.log.Info(context.Background(), "events batch of %d events is successfully saved", len(batch))
	return nil
}

func (ds *S3Storage) Close() error {
	return nil
}
