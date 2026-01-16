package api

import (
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/klauspost/compress/gzip"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/user"
)

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
	if (strings.HasSuffix(pathTemplate, "/spots/{id}") && r.Method == "GET") ||
		(strings.HasSuffix(pathTemplate, "/spots/{id}/comment") && r.Method == "POST") ||
		(strings.HasSuffix(pathTemplate, "/spots/{id}/status") && r.Method == "GET") {
		return true
	}
	return false
}

func GetPathParam[T any](r *http.Request, key string, parseFunc func(string) (T, error), defaultValue ...T) (T, error) {
	var zero T
	valueStr, ok := mux.Vars(r)[key]
	if !ok || valueStr == "" {
		if len(defaultValue) > 0 {
			return defaultValue[0], nil
		}
		return zero, fmt.Errorf("missing path param: %s", key)
	}
	value, err := parseFunc(valueStr)
	if err != nil {
		if len(defaultValue) > 0 {
			return defaultValue[0], nil
		}
		return zero, fmt.Errorf("invalid path param %s: %w", key, err)
	}
	return value, nil
}

func GetQueryParam[T any](r *http.Request, key string, parseFunc func(string) (T, error), defaultValue ...T) T {
	var zero T
	valueStr := r.URL.Query().Get(key)
	if valueStr == "" {
		if len(defaultValue) > 0 {
			return defaultValue[0]
		}
		return zero
	}
	value, err := parseFunc(valueStr)
	if err != nil {
		if len(defaultValue) > 0 {
			return defaultValue[0]
		}
		return zero
	}
	return value
}

func ParseString(s string) (string, error) {
	return s, nil
}

func ParseBool(s string) (bool, error) {
	return strconv.ParseBool(s)
}

func ParseInt(s string) (int, error) {
	return strconv.Atoi(s)
}

func ParseUint32(s string) (uint32, error) {
	v, err := strconv.ParseUint(s, 10, 32)
	return uint32(v), err
}

func ParseUint64(s string) (uint64, error) {
	return strconv.ParseUint(s, 10, 64)
}

type RequestContext struct {
	Writer    http.ResponseWriter
	Request   *http.Request
	Body      []byte
	StartTime time.Time
	BodySize  int
	ProjectID uint32
}

func (rc *RequestContext) GetProjectID() (uint32, error) {
	if rc.ProjectID != 0 {
		return rc.ProjectID, nil
	}
	projID, err := GetPathParam(rc.Request, "project", ParseUint32)
	if err != nil {
		return 0, err
	}
	rc.ProjectID = projID
	return projID, nil
}
