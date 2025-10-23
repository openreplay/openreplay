package api

import (
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/klauspost/compress/gzip"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/user"
)

const API_KEY_PREFIX = "/vx/" // TODO: change back to v1 once the other endpoints are removed

func GetProject(r *http.Request) (uint32, error) {
	vars := mux.Vars(r)
	projID := vars["project"]
	projectID, err := strconv.Atoi(projID)
	if err != nil {
		return 0, err
	}
	return uint32(projectID), nil
}

func GetParam(r *http.Request, param string) (string, error) {
	vars := mux.Vars(r)
	value := vars[param]
	if value == "" {
		return "", fmt.Errorf("missing %s in request", param)
	}
	return value, nil
}

func GetSession(r *http.Request) string {
	vars := mux.Vars(r)
	return vars["session"]
}

func GetSessionID(r *http.Request) (uint64, error) {
	sess := GetSession(r)
	sessID, err := strconv.Atoi(sess)
	if err != nil {
		return 0, err
	}
	return uint64(sessID), nil
}

func GetUser(r *http.Request) *user.User {
	return r.Context().Value("userData").(*user.User)
}

func ReadBody(log logger.Logger, w http.ResponseWriter, r *http.Request, limit int64) ([]byte, error) {
	body := http.MaxBytesReader(w, r.Body, limit)
	bodyBytes, err := io.ReadAll(body)

	if closeErr := body.Close(); closeErr != nil {
		log.Warn(r.Context(), "error while closing request body: %s", closeErr)
	}
	if err != nil {
		return nil, err
	}
	return bodyBytes, nil
}

func ReadCompressedBody(log logger.Logger, w http.ResponseWriter, r *http.Request, limit int64) ([]byte, error) {
	body := http.MaxBytesReader(w, r.Body, limit)
	var (
		bodyBytes []byte
		err       error
	)

	// Check if body is gzipped and decompress it
	if r.Header.Get("Content-Encoding") == "gzip" {
		reader, err := gzip.NewReader(body)
		if err != nil {
			return nil, fmt.Errorf("can't create gzip reader: %s", err)
		}
		bodyBytes, err = io.ReadAll(reader)
		if err != nil {
			return nil, fmt.Errorf("can't read gzip body: %s", err)
		}
		if err := reader.Close(); err != nil {
			log.Warn(r.Context(), "can't close gzip reader: %s", err)
		}
	} else {
		bodyBytes, err = io.ReadAll(body)
	}

	if closeErr := body.Close(); closeErr != nil {
		log.Warn(r.Context(), "error while closing request body: %s", closeErr)
	}
	if err != nil {
		return nil, err
	}
	return bodyBytes, nil
}

func IsApiKeyRequest(r *http.Request) bool {
	return strings.HasPrefix(r.URL.Path, API_KEY_PREFIX)
}

func IsExtensionRequest(r *http.Request) bool {
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		fmt.Printf("failed to get path template: %s", err)
		return false
	}
	if strings.HasSuffix(pathTemplate, "/v1/ping") ||
		(strings.HasSuffix(pathTemplate, "/v1/spots") && r.Method == "POST") ||
		(strings.HasSuffix(pathTemplate, "/v1/spots/{id}/uploaded") && r.Method == "POST") {
		return true
	}
	return false
}

func IsSpotKeyRequest(r *http.Request) bool {
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		fmt.Printf("failed to get path template: %s", err)
		return false
	}
	if (strings.HasSuffix(pathTemplate, "/v1/spots/{id}") && r.Method == "GET") ||
		(strings.HasSuffix(pathTemplate, "/v1/spots/{id}/comment") && r.Method == "POST") ||
		(strings.HasSuffix(pathTemplate, "/v1/spots/{id}/status") && r.Method == "GET") {
		return true
	}
	return false
}

func GetIDFromRequest(r *http.Request, key string) (int, error) {
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

func GetStringFromRequest(r *http.Request, key string) (string, error) {
	vars := mux.Vars(r)
	value := vars[key]
	if value == "" {
		return "", fmt.Errorf("missing %s in request", key)
	}
	return value, nil
}

func ParseIntQueryParam(r *http.Request, key string, defaultValue int) int {
	valueStr := r.URL.Query().Get(key)
	if valueStr == "" {
		return defaultValue
	}

	if value, err := strconv.Atoi(valueStr); err == nil && value > 0 {
		return value
	}

	return defaultValue
}

func ParseBoolQueryParam(r *http.Request, key string, defaultValue bool) bool {
	valueStr := r.URL.Query().Get(key)
	if valueStr == "" {
		return defaultValue
	}

	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}

	return defaultValue
}

func ParseStatusQueryParam(r *http.Request, defaultStatus string) string {
	statusStr := r.URL.Query().Get("status")
	if statusStr != "" {
		return statusStr
	}
	return defaultStatus
}
