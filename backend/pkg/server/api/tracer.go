package api

import (
	"net/http"
)

func (e *routerImpl) logRequest(r *http.Request, bodyBytes []byte, statusCode int) {}
