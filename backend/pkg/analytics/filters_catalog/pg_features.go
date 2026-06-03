package filters_catalog

import (
	"context"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

func (s *filtersCatalogImpl) getFeaturesFilters(ctx context.Context, projectID uint32) (model.FilterSection, error) {
	items, err := s.features.ListForFilters(int(projectID))
	if err != nil {
		return model.FilterSection{}, err
	}
	list := make([]any, 0, len(items))
	for _, it := range items {
		list = append(list, model.FeatureItem{
			TagID:           it.TagID,
			Name:            it.Name,
			DisplayName:     it.Name,
			Selector:        it.Selector,
			IgnoreClickRage: it.IgnoreClickRage,
			IgnoreDeadClick: it.IgnoreDeadClick,
			Location:        it.Location,
			IsFeature:       true,
		})
	}
	return model.FilterSection{
		Total:       len(items),
		DisplayName: "Features",
		Scope:       []string{"sessions", "events"},
		List:        list,
	}, nil
}
