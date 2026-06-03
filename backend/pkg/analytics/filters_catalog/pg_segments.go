package filters_catalog

import (
	"context"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

func (s *filtersCatalogImpl) getSegmentsFilters(ctx context.Context, projectID uint32, userID uint64) (model.FilterSection, error) {
	items, err := s.segments.ListForFilters(int(projectID), int(userID))
	if err != nil {
		return model.FilterSection{}, err
	}
	list := make([]any, 0, len(items))
	for _, it := range items {
		list = append(list, model.SegmentItem{
			SearchID:    it.SearchID,
			Name:        it.Name,
			DisplayName: it.Name,
			IsPublic:    it.IsPublic,
			IsSegment:   true,
		})
	}
	return model.FilterSection{
		Total:       len(items),
		DisplayName: "Segments",
		Scope:       []string{"sessions", "events"},
		List:        list,
	}, nil
}
