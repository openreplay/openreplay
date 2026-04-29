package filters_catalog

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
	savedSearches "openreplay/backend/pkg/analytics/saved_searches"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	tagAdmin "openreplay/backend/pkg/tags/admin"
)

// FiltersCatalog assembles the multi-section response served by
// GET /{project}/filters.
type FiltersCatalog interface {
	// GetAllFilters returns the union of all filter sections for the given project.
	GetAllFilters(ctx context.Context, projectID uint32, userID uint64, platform string) (*model.AllFiltersResponse, error)
}

type filtersCatalogImpl struct {
	log      logger.Logger
	ch       driver.Conn
	pg       pool.Pool
	projects projects.Projects
	segments savedSearches.SavedSearches
	features tagAdmin.TagService
}

func New(log logger.Logger, ch driver.Conn, pg pool.Pool, p projects.Projects, segments savedSearches.SavedSearches, features tagAdmin.TagService) FiltersCatalog {
	return &filtersCatalogImpl{
		log: log, ch: ch, pg: pg,
		projects: p, segments: segments, features: features,
	}
}
