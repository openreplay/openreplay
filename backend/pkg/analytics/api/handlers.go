package api

import (
	"fmt"
	"github.com/gorilla/mux"
	"net/http"
	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics/service"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/keys"
	"strconv"
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
		{"/v1/analytics/{projectId}/cards", e.createCard, "POST"},
		{"/v1/analytics/{projectId}/cards", e.getCardsPaginated, "GET"},
		{"/v1/analytics/{projectId}/cards/{id}", e.getCard, "GET"},
		{"/v1/analytics/{projectId}/cards/{id}", e.updateCard, "PUT"},
		{"/v1/analytics/{projectId}/cards/{id}", e.deleteCard, "DELETE"},
		{"/v1/analytics/{projectId}/cards/{id}/chart", e.getCardChartData, "POST"},
		{"/v1/analytics/{projectId}/cards/{id}/try", e.getCardChartData, "POST"},
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

func getIDFromRequest(r *http.Request, key string) (int, error) {
	vars := mux.Vars(r)
	idStr := vars[key]
	if idStr == "" {
		return 0, fmt.Errorf("missing %s in request", key)
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return 0, fmt.Errorf("invalid %s format", key)
	}

	return id, nil
}
