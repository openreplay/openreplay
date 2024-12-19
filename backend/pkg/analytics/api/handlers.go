package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"

	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics/service"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/server/api"
)

type handlersImpl struct {
	log           logger.Logger
	responser     *api.Responser
	objStorage    objectstorage.ObjectStorage
	jsonSizeLimit int64
	service       service.Service
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/analytics/{projectId}/dashboards", e.createDashboard, "POST"},
		{"/v1/analytics/{projectId}/dashboards", e.getDashboards, "GET"},
		{"/v1/analytics/{projectId}/dashboards/{id}", e.getDashboard, "GET"},
		{"/v1/analytics/{projectId}/dashboards/{id}", e.updateDashboard, "PUT"},
		{"/v1/analytics/{projectId}/dashboards/{id}", e.deleteDashboard, "DELETE"},
		{"/v1/analytics/{projectId}/dashboards/{id}/cards", e.addCardToDashboard, "POST"},
		{"/v1/analytics/{projectId}/dashboards/{id}/cards/{cardId}", e.removeCardFromDashboard, "DELETE"},
		{"/v1/analytics/{projectId}/cards", e.createCard, "POST"},
		{"/v1/analytics/{projectId}/cards", e.getCardsPaginated, "GET"},
		{"/v1/analytics/{projectId}/cards/{id}", e.getCard, "GET"},
		{"/v1/analytics/{projectId}/cards/{id}", e.updateCard, "PUT"},
		{"/v1/analytics/{projectId}/cards/{id}", e.deleteCard, "DELETE"},
		{"/v1/analytics/{projectId}/cards/{id}/chart", e.getCardChartData, "POST"},
		{"/v1/analytics/{projectId}/cards/{id}/try", e.getCardChartData, "POST"},
	}
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser *api.Responser, objStore objectstorage.ObjectStorage, service service.Service) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		objStorage:    objStore,
		jsonSizeLimit: cfg.JsonSizeLimit,
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
