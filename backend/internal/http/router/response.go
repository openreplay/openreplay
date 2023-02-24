package router

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	metrics "openreplay/backend/pkg/metrics/http"
)

func recordMetrics(requestStart time.Time, url string, code, bodySize int) {
	if bodySize > 0 {
		metrics.RecordRequestSize(float64(bodySize), url, code)
	}
	metrics.IncreaseTotalRequests()
	metrics.RecordRequestDuration(float64(time.Now().Sub(requestStart).Milliseconds()), url, code)
}

func ResponseOK(w http.ResponseWriter, requestStart time.Time, url string, bodySize int) {
	w.WriteHeader(http.StatusOK)
	recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

func ResponseWithJSON(w http.ResponseWriter, res interface{}, requestStart time.Time, url string, bodySize int) {
	body, err := json.Marshal(res)
	if err != nil {
		log.Println(err)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
	recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

type response struct {
	Error string `json:"error"`
}

func ResponseWithError(w http.ResponseWriter, code int, err error, requestStart time.Time, url string, bodySize int) {
	body, err := json.Marshal(&response{err.Error()})
	if err != nil {
		log.Println(err)
	}
	w.WriteHeader(code)
	w.Write(body)
	recordMetrics(requestStart, url, code, bodySize)
}
