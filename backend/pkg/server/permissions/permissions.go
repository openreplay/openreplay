package permissions

import (
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

func New(log logger.Logger) api.RouterMiddleware {
	return api.NewDefaultMiddleware()
}
