package router

import (
	"errors"
	"net/http"
	"time"
)

func (e *Router) getConditions(w http.ResponseWriter, r *http.Request) {
	ResponseWithError(w, http.StatusNotImplemented, errors.New("no support"), time.Now(), r.URL.Path, 0)
}
