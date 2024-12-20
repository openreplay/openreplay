package service

import (
	"context"
	"errors"

	"openreplay/backend/pkg/analytics/api/models"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Service interface {
	GetDashboard(projectId int, dashboardId int, userId uint64) (*models.GetDashboardResponse, error)
	GetDashboardsPaginated(projectId int, userId uint64, req *models.GetDashboardsRequest) (*models.GetDashboardsResponsePaginated, error)
	GetDashboards(projectId int, userId uint64) (*models.GetDashboardsResponse, error)
	CreateDashboard(projectId int, userId uint64, req *models.CreateDashboardRequest) (*models.GetDashboardResponse, error)
	UpdateDashboard(projectId int, dashboardId int, userId uint64, req *models.UpdateDashboardRequest) (*models.GetDashboardResponse, error)
	DeleteDashboard(projectId int, dashboardId int, userId uint64) error
	AddCardsToDashboard(projectId int, dashboardId int, userId uint64, req *models.AddCardToDashboardRequest) error
	DeleteCardFromDashboard(dashboardId int, cardId int) error
	GetCard(projectId int, cardId int) (*models.CardGetResponse, error)
	GetCardWithSeries(projectId int, cardId int) (*models.CardGetResponse, error)
	GetCards(projectId int) (*models.GetCardsResponse, error)
	GetCardsPaginated(projectId int, filters models.CardListFilter, sort models.CardListSort, limit int, offset int) (*models.GetCardsResponsePaginated, error)
	CreateCard(projectId int, userId uint64, req *models.CardCreateRequest) (*models.CardGetResponse, error)
	UpdateCard(projectId int, cardId int64, userId uint64, req *models.CardUpdateRequest) (*models.CardGetResponse, error)
	DeleteCard(projectId int, cardId int64, userId uint64) error
	GetCardChartData(projectId int, userId uint64, req *models.GetCardChartDataRequest) ([]models.DataPoint, error)
}

type serviceImpl struct {
	log    logger.Logger
	pgconn pool.Pool
	ctx    context.Context
}

func NewService(log logger.Logger, conn pool.Pool) (Service, error) {
	switch {
	case log == nil:
		return nil, errors.New("logger is empty")
	case conn == nil:
		return nil, errors.New("connection pool is empty")
	}

	return &serviceImpl{
		log:    log,
		pgconn: conn,
		ctx:    context.Background(),
	}, nil
}
