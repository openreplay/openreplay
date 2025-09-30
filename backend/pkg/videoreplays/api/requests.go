package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

const (
	DefaultPage  = 1
	DefaultLimit = 10
)

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
