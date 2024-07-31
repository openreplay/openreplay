package api

import (
	"github.com/gorilla/mux"
	"net/http"
	"openreplay/backend/pkg/spot/service"
)

func (e *Router) requestParser(r *http.Request) *service.RequestData {
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		e.log.Error(r.Context(), "failed to get path template: %s", err)
	}
	currRoute := mux.CurrentRoute(r)
	if currRoute == nil {
		e.log.Error(r.Context(), "failed to get current route")
	}
	assignedMethods, err := currRoute.GetMethods()
	if err != nil {
		e.log.Error(r.Context(), "failed to get methods: %s", err)
	}
	e.log.Info(r.Context(), "assigned methods: %v", assignedMethods)
	assignedMethod := ""
	if len(assignedMethods) == 0 {
		e.log.Error(r.Context(), "no methods assigned to the route")
	} else {
		assignedMethod = assignedMethods[0]
	}
	e.log.Info(r.Context(), "assigned method: %s", assignedMethod)
	e.log.Info(r.Context(), "path template: %s", pathTemplate)
	return &service.RequestData{
		Action:     assignedMethod,
		Method:     r.Method,
		PathFormat: pathTemplate,
		Endpoint:   r.URL.Path,
		Payload:    nil,
		Parameters: nil,
		Status:     200,
	}
}
