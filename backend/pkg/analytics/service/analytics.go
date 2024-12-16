package service

import (
	"errors"
	"openreplay/backend/pkg/analytics/api/models"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
)

type Service interface {
	GetDashboard(projectId int, dashboardId int, userId uint64) (*models.GetDashboardResponse, error)
	GetDashboardsPaginated(projectId int, userId uint64, req *models.GetDashboardsRequest) (*models.GetDashboardsResponsePaginated, error)
	GetDashboards(projectId int, userId uint64) (*models.GetDashboardsResponse, error)
	CreateDashboard(projectId int, userId uint64, req *models.CreateDashboardRequest) (*models.GetDashboardResponse, error)
	UpdateDashboard(projectId int, dashboardId int, userId uint64, req *models.UpdateDashboardRequest) (*models.GetDashboardResponse, error)
	DeleteDashboard(projectId int, dashboardId int, userId uint64) error
}

type serviceImpl struct {
	log     logger.Logger
	pgconn  pool.Pool
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
		pgconn:  conn,
		storage: storage,
	}, nil
}
