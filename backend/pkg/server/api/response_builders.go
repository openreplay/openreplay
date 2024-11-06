package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/klauspost/compress/gzip"

	"openreplay/backend/pkg/logger"
)

// TODO: Think how to insert into correct service related metrics
func RecordMetrics(requestStart time.Time, url string, code, bodySize int) {
	//metrics := util.GetMetrics()
	//if bodySize > 0 {
	//	metrics.RecordRequestSize(float64(bodySize), url, code)
	//}
	//metrics.IncreaseTotalRequests()
	//metrics.RecordRequestDuration(float64(time.Now().Sub(requestStart).Milliseconds()), url, code)
}

func ReadBody(log logger.Logger, w http.ResponseWriter, r *http.Request, limit int64) ([]byte, error) {
	body := http.MaxBytesReader(w, r.Body, limit)
	bodyBytes, err := io.ReadAll(body)

	// Close body
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

	// Close body
	if closeErr := body.Close(); closeErr != nil {
		log.Warn(r.Context(), "error while closing request body: %s", closeErr)
	}
	if err != nil {
		return nil, err
	}
	return bodyBytes, nil
}

func ResponseOK(log logger.Logger, ctx context.Context, w http.ResponseWriter, requestStart time.Time, url string, bodySize int) {
	w.WriteHeader(http.StatusOK)
	log.Info(ctx, "response ok")
	RecordMetrics(requestStart, url, http.StatusOK, bodySize)
}

func ResponseWithJSON(log logger.Logger, ctx context.Context, w http.ResponseWriter, res interface{}, requestStart time.Time, url string, bodySize int) {
	log.Info(ctx, "response ok")
	body, err := json.Marshal(res)
	if err != nil {
		log.Error(ctx, "can't marshal response: %s", err)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
	RecordMetrics(requestStart, url, http.StatusOK, bodySize)
}

type response struct {
	Error string `json:"error"`
}

func ResponseWithError(log logger.Logger, ctx context.Context, w http.ResponseWriter, code int, err error, requestStart time.Time, url string, bodySize int) {
	log.Error(ctx, "response error, code: %d, error: %s", code, err)
	body, err := json.Marshal(&response{err.Error()})
	if err != nil {
		log.Error(ctx, "can't marshal response: %s", err)
	}
	w.WriteHeader(code)
	w.Write(body)
	RecordMetrics(requestStart, url, code, bodySize)
}
