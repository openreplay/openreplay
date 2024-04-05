package router

import (
	"io"
	"net/http"
	"time"

	gzip "github.com/klauspost/pgzip"
)

func (e *Router) pushMessages(w http.ResponseWriter, r *http.Request, sessionID uint64, topicName string) {
	start := time.Now()
	body := http.MaxBytesReader(w, r.Body, e.cfg.BeaconSizeLimit)
	defer body.Close()

	var reader io.ReadCloser
	var err error

	switch r.Header.Get("Content-Encoding") {
	case "gzip":
		reader, err = gzip.NewReader(body)
		if err != nil {
			e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, start, r.URL.Path, 0)
			return
		}
		defer reader.Close()
	default:
		reader = body
	}
	buf, err := io.ReadAll(reader)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, start, r.URL.Path, 0)
		return
	}
	if err := e.services.Producer.Produce(topicName, sessionID, buf); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, start, r.URL.Path, 0)
		return
	}
	w.WriteHeader(http.StatusOK)
	e.log.Info(r.Context(), "response ok")
}
