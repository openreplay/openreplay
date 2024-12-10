package service

import (
	"errors"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
)

type Service interface {
}

type serviceImpl struct {
	log     logger.Logger
	conn    pool.Pool
	storage objectstorage.ObjectStorage
}

func NewService(log logger.Logger, conn pool.Pool, storage objectstorage.ObjectStorage) (Service, error) {
	switch {
	case log == nil:
		return nil, errors.New("logger is empty")
	case conn == nil:
		return nil, errors.New("connection pool is empty")
	case storage == nil:
		return nil, errors.New("object storage is empty")
	}

	return &serviceImpl{
		log:     log,
		conn:    conn,
		storage: storage,
	}, nil
}
