package api

import (
	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics/service"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/keys"
)

type handlersImpl struct {
	log           logger.Logger
	responser     *api.Responser
	objStorage    objectstorage.ObjectStorage
	jsonSizeLimit int64
	keys          keys.Keys
	service       service.Service
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/analytics/{projectId}/dashboards", e.createDashboard, "POST"},
		{"/v1/analytics/{projectId}/dashboards", e.getDashboards, "GET"},
		{"/v1/analytics/{projectId}/dashboards/{id}", e.getDashboard, "GET"},
		{"/v1/analytics/{projectId}/dashboards/{id}", e.updateDashboard, "PUT"},
		{"/v1/analytics/{projectId}/dashboards/{id}", e.deleteDashboard, "DELETE"},
	}
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser *api.Responser, objStore objectstorage.ObjectStorage, keys keys.Keys, service service.Service) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		objStorage:    objStore,
		jsonSizeLimit: cfg.JsonSizeLimit,
		keys:          keys,
		service:       service,
	}, nil
}
