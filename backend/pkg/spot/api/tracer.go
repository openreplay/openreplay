package api

import (
	"net/http"
)

func (e *Router) logRequest(r *http.Request, bodyBytes []byte, statusCode int) {}
