package filters_catalog

import (
	"context"
	"fmt"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

// getMetadataFilters mirrors api/chalicelib/core/metadata.py:get_for_filters.
// Reads metadata_1..metadata_10 columns from the projects row via the existing
// projects service.
func (s *filtersCatalogImpl) getMetadataFilters(ctx context.Context, projectID uint32) (model.FilterSection, error) {
	p, err := s.projects.GetProject(projectID)
	if err != nil {
		return model.FilterSection{}, fmt.Errorf("get project for metadata: %w", err)
	}
	cols := []struct {
		key   string
		value *string
	}{
		{"metadata_1", p.Metadata1},
		{"metadata_2", p.Metadata2},
		{"metadata_3", p.Metadata3},
		{"metadata_4", p.Metadata4},
		{"metadata_5", p.Metadata5},
		{"metadata_6", p.Metadata6},
		{"metadata_7", p.Metadata7},
		{"metadata_8", p.Metadata8},
		{"metadata_9", p.Metadata9},
		{"metadata_10", p.Metadata10},
	}
	list := make([]any, 0, len(cols))
	for i, c := range cols {
		if c.value == nil || *c.value == "" {
			continue
		}
		list = append(list, model.MetadataItem{
			ID:            fmt.Sprintf("meta_%d", i),
			Name:          c.key,
			DisplayName:   *c.value,
			PossibleTypes: []string{"string"},
			DataType:      "string",
			AutoCaptured:  true,
		})
	}
	return model.FilterSection{
		Total:       len(list),
		DisplayName: "Metadata",
		Scope:       []string{"sessions"},
		List:        list,
	}, nil
}
