package api

import (
	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
)

type Worker interface {
	Run()
	Stop()
}

type Service interface {
	Handlers() []api.Handlers
	Run()
	Close()
}

type eeDeps struct {
	log        logger.Logger
	cfg        *config.Config
	pgconn     pool.Pool
	objStore   objectstorage.ObjectStorage
	projects   projects.Projects
	webMetrics web.Web
	dbMetrics  database.Database
}
