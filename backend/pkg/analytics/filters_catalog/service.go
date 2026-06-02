package filters_catalog

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
	savedSearches "openreplay/backend/pkg/analytics/saved_searches"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	tagAdmin "openreplay/backend/pkg/tags/admin"
)

// FiltersCatalog assembles the multi-section response served by
// GET /{project}/filters.
type FiltersCatalog interface {
	// GetAllFilters returns the union of all filter sections for the given project.
	GetAllFilters(ctx context.Context, projectID uint32, userID uint64, platform string) (*model.AllFiltersResponse, error)
	SearchEventsAutocomplete(ctx context.Context, projectID uint32, q string) ([]model.AutocompleteRow, error)
	SearchPropertiesAutocomplete(ctx context.Context, projectID uint32, propertyName, eventName, userID, source, q string, autoCaptured bool) ([]model.AutocompleteRow, error)
}

type filtersCatalogImpl struct {
	log      logger.Logger
	ch       driver.Conn
	projects projects.Projects
	segments savedSearches.SavedSearches
	features tagAdmin.TagService
	acCache  *autocompleteCache
}

func New(log logger.Logger, ch driver.Conn, p projects.Projects, segments savedSearches.SavedSearches, features tagAdmin.TagService) FiltersCatalog {
	return &filtersCatalogImpl{
		log: log, ch: ch,
		projects: p, segments: segments, features: features,
		acCache: newAutocompleteCache(autocompleteCacheTTL),
	}
}
