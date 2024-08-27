package api

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"

	"openreplay/backend/pkg/spot/auth"
	"openreplay/backend/pkg/spot/service"
)

var routeMatch = map[string]string{
	"POST" + "/v1/spots":                  "createSpot",
	"GET" + "/v1/spots/{id}":              "getSpot",
	"PATCH" + "/v1/spots/{id}":            "updateSpot",
	"GET" + "/v1/spots":                   "getSpots",
	"DELETE" + "/v1/spots":                "deleteSpots",
	"POST" + "/v1/spots/{id}/comment":     "addComment",
	"GET" + "/v1/spots/{id}/video":        "getSpotVideo",
	"PATCH" + "/v1/spots/{id}/public-key": "updatePublicKey",
}

func (e *Router) requestParser(r *http.Request, bodyBytes []byte, statusCode int) {
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		e.log.Error(r.Context(), "failed to get path template: %s", err)
	}
	e.log.Info(r.Context(), "path template: %s", pathTemplate)
	// Convert the parameters to json
	query := r.URL.Query()
	params := make(map[string]interface{})
	for key, values := range query {
		if len(values) > 1 {
			params[key] = values
		} else {
			params[key] = values[0]
		}
	}
	jsonData, err := json.Marshal(params)
	if err != nil {
		e.log.Error(r.Context(), "failed to marshal query parameters: %s", err)
	}
	requestData := &service.RequestData{
		Action:     routeMatch[r.Method+pathTemplate],
		Method:     r.Method,
		PathFormat: pathTemplate,
		Endpoint:   r.URL.Path,
		Payload:    bodyBytes,
		Parameters: jsonData,
		Status:     statusCode,
	}
	userData := r.Context().Value("userData").(*auth.User)
	e.services.Tracer.Trace(userData, requestData)
	// DEBUG
	e.log.Info(r.Context(), "request data: %v", data)
}
