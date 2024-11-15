package tracer

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/gorilla/mux"

	"openreplay/backend/pkg/server/user"
)

type statusWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *statusWriter) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if w.statusCode == 0 {
		w.statusCode = http.StatusOK
	}
	return w.ResponseWriter.Write(b)
}

func (t *tracerImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Read body and restore the io.ReadCloser to its original state
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "can't read body", http.StatusBadRequest)
			return
		}
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		// Use custom response writer to get the status code
		sw := &statusWriter{ResponseWriter: w}
		// Serve the request
		next.ServeHTTP(sw, r)
		t.logRequest(r, bodyBytes, sw.statusCode)
	})
}

var routeMatch = map[string]string{
	"POST" + "/spot/v1/spots":                  "createSpot",
	"GET" + "/spot/v1/spots/{id}":              "getSpot",
	"PATCH" + "/spot/v1/spots/{id}":            "updateSpot",
	"GET" + "/spot/v1/spots":                   "getSpots",
	"DELETE" + "/spot/v1/spots":                "deleteSpots",
	"POST" + "/spot/v1/spots/{id}/comment":     "addComment",
	"GET" + "/spot/v1/spots/{id}/video":        "getSpotVideo",
	"PATCH" + "/spot/v1/spots/{id}/public-key": "updatePublicKey",
}

func (t *tracerImpl) logRequest(r *http.Request, bodyBytes []byte, statusCode int) {
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		t.log.Error(r.Context(), "failed to get path template: %s", err)
	}
	t.log.Debug(r.Context(), "path template: %s", pathTemplate)
	if _, ok := routeMatch[r.Method+pathTemplate]; !ok {
		t.log.Debug(r.Context(), "no match for route: %s %s", r.Method, pathTemplate)
		return
	}
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
		t.log.Error(r.Context(), "failed to marshal query parameters: %s", err)
	}
	requestData := &RequestData{
		Action:     routeMatch[r.Method+pathTemplate],
		Method:     r.Method,
		PathFormat: pathTemplate,
		Endpoint:   r.URL.Path,
		Payload:    bodyBytes,
		Parameters: jsonData,
		Status:     statusCode,
	}
	userData := r.Context().Value("userData").(*user.User)
	t.trace(userData, requestData)
	// DEBUG
	t.log.Debug(r.Context(), "request data: %v", requestData)
}
