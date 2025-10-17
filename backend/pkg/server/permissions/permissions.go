package permissions

import (
	"net/http"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

type permissionsImpl struct{}

func (p *permissionsImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}

func NewPermissions(log logger.Logger, handlers []api.Handlers) (api.RouterMiddleware, error) {
	return &permissionsImpl{}, nil
}
