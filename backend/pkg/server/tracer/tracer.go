package tracer

import (
	"net/http"
)

func logRequest(r *http.Request, bodyBytes []byte, statusCode int) {}
