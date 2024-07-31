package api

import (
	"github.com/gorilla/mux"
	"net/http"
	"openreplay/backend/pkg/spot/service"
)

var routeMatch = map[string]string{
	"POST" + "/v1/spots":                  "createSpot",
	"GET" + "/v1/spots/{id}":              "getSpot",
	"PATCH" + "/v1/spots/{id}":            "updateSpot",
	"GET" + "/v1/spots":                   "getSpots",
	"DELETE" + "/v1/spots":                "deleteSpots",
	"POST" + "/v1/spots/{id}/comment":     "addComment",
	"POST" + "/v1/spots/{id}/uploaded":    "uploadedSpot",
	"GET" + "/v1/spots/{id}/video":        "getSpotVideo",
	"GET" + "/v1/spots/{id}/public-key":   "getPublicKey",
	"PATCH" + "/v1/spots/{id}/public-key": "updatePublicKey",
}

func (e *Router) requestParser(r *http.Request) *service.RequestData {
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		e.log.Error(r.Context(), "failed to get path template: %s", err)
	}
	e.log.Info(r.Context(), "path template: %s", pathTemplate)
	return &service.RequestData{
		Action:     routeMatch[r.Method+pathTemplate],
		Method:     r.Method,
		PathFormat: pathTemplate,
		Endpoint:   r.URL.Path,
		Payload:    nil,
		Parameters: nil,
		Status:     200,
	}
}
