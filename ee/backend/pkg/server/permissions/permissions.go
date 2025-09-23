package permissions

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gorilla/mux"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

type permissionsImpl struct {
	log   logger.Logger
	perms map[string][]string
}

func (p *permissionsImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := p.checkPermissions(r); err != nil {
			p.log.Warn(r.Context(), err.Error())
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (p *permissionsImpl) checkPermissions(r *http.Request) error {
	user := api.GetUser(r)
	if user == nil {
		return fmt.Errorf("unauthorized request, no user's data")
	}
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		p.log.Error(r.Context(), "failed to get path template: %s", err)
		return nil
	}
	p.log.Debug(r.Context(), "path template: %s", pathTemplate)
	reqPermissions, ok := p.perms[r.Method+pathTemplate]
	if !ok || len(reqPermissions) == 0 {
		p.log.Debug(r.Context(), "no match for route: %s %s", r.Method, pathTemplate)
		return nil
	}

	var perms []string
	for _, perm := range reqPermissions {
		if user.ServiceAccount {
			if strings.HasPrefix(perm, "SERVICE_") {
				perms = append(perms, perm)
			}
		} else {
			if !strings.HasPrefix(perm, "SERVICE_") {
				perms = append(perms, perm)
			}
		}
	}

	for _, perm := range perms {
		if _, ok := user.Permissions[perm]; !ok {
			return fmt.Errorf("unauthorized request, permission %s is required", perm)
		}
	}
	return nil
}

func NewPermissions(log logger.Logger, handlers []api.Handlers) (api.RouterMiddleware, error) {
	perms := make(map[string][]string)
	for _, handlersSet := range handlers {
		for _, handler := range handlersSet.GetAll() {
			if handler.Permissions != nil {
				perms[handler.Method+handler.Path] = handler.Permissions
			}
		}
	}
	return &permissionsImpl{log: log, perms: perms}, nil
}
