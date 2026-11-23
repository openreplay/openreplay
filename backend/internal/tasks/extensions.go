package tasks

import (
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	config "openreplay/backend/internal/config/tasks"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
)

// eeDeps is what edition-specific crons can be built from. It is shared by the community
// stub (ee.go) and the EE override (ee/backend/internal/tasks/ee.go); keep it here so both
// editions compile against the same type.
type eeDeps struct {
	log      logger.Logger
	cfg      *config.Config
	pg       pool.Pool
	ch       driver.Conn
	objStore objectstorage.ObjectStorage
}
