package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/web"
)

type Responser struct {
	metrics web.Web
}

func NewResponser(webMetrics web.Web) *Responser {
	return &Responser{
		metrics: webMetrics,
	}
}

type response struct {
	Error string `json:"error"`
}

func (r *Responser) ResponseOK(log logger.Logger, ctx context.Context, w http.ResponseWriter, requestStart time.Time, url string, bodySize int) {
	w.WriteHeader(http.StatusOK)
	log.Info(ctx, "response ok")
	r.recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

func (r *Responser) ResponseWithJSON(log logger.Logger, ctx context.Context, w http.ResponseWriter, res interface{}, requestStart time.Time, url string, bodySize int) {
	log.Info(ctx, "response ok")
	body, err := json.Marshal(res)
	if err != nil {
		log.Error(ctx, "can't marshal response: %s", err)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
	r.recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

func (r *Responser) ResponseWithError(log logger.Logger, ctx context.Context, w http.ResponseWriter, code int, err error, requestStart time.Time, url string, bodySize int) {
	log.Error(ctx, "response error, code: %d, error: %s", code, err)
	body, err := json.Marshal(&response{err.Error()})
	if err != nil {
		log.Error(ctx, "can't marshal response: %s", err)
	}
	w.WriteHeader(code)
	w.Write(body)
	r.recordMetrics(requestStart, url, code, bodySize)
}

func (r *Responser) recordMetrics(requestStart time.Time, url string, code, bodySize int) {
	if bodySize > 0 {
		r.metrics.RecordRequestSize(float64(bodySize), url, code)
	}
	r.metrics.IncreaseTotalRequests()
	r.metrics.RecordRequestDuration(float64(time.Now().Sub(requestStart).Milliseconds()), url, code)
}
