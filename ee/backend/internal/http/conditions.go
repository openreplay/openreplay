package router

import (
	"github.com/gorilla/mux"
	"net/http"
	"strconv"
	"time"
)

func (e *Router) getConditions(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	_, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Get taskID
	vars := mux.Vars(r)
	projID := vars["project"]
	projectID, err := strconv.Atoi(projID)
	if err != nil {
		ResponseWithError(w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Get task info
	info, err := e.services.Conditions.Get(uint32(projectID))
	if err != nil {
		ResponseWithError(w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	ResponseWithJSON(w, info, startTime, r.URL.Path, bodySize)
}
