package tracer

import (
	"bytes"
	"io"
	"net/http"
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

func ActionMiddleware(next http.Handler) http.Handler {
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
		logRequest(r, bodyBytes, sw.statusCode)
	})
}
