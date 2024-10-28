package api

import (
	"github.com/gorilla/mux"
	analyticsConfig "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/common"
	"openreplay/backend/pkg/logger"
	"sync"
)

type Router struct {
	log      logger.Logger
	cfg      *analyticsConfig.Config
	router   *mux.Router
	mutex    *sync.RWMutex
	services *common.ServicesBuilder
	limiter  *common.UserRateLimiter
}
