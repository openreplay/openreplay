package api

import (
	"fmt"
	"io"
	"net/http"
	"strconv"

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
