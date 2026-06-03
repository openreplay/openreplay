package filters_catalog

import (
	"context"
	"fmt"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

func (s *filtersCatalogImpl) GetAllFilters(ctx context.Context, projectID uint32, userID uint64, platform string) (*model.AllFiltersResponse, error) {
	events, err := s.getEventsCatalog(ctx, projectID, platform)
	if err != nil {
		return nil, fmt.Errorf("events catalog: %w", err)
	}
	properties, err := s.getPropertiesCatalog(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("properties catalog: %w", err)
	}
	metadata, err := s.getMetadataFilters(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("metadata catalog: %w", err)
	}
	segments, err := s.getSegmentsFilters(ctx, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("segments catalog: %w", err)
	}
	features, err := s.getFeaturesFilters(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("features catalog: %w", err)
	}
	return &model.AllFiltersResponse{
		Events:   events,
		Event:    properties,
		Session:  GetSessionsFilters(),
		User:     GetUsersFilters(),
		Users:    GetUsersIdentifiedFilters(),
		Metadata: metadata,
		Segments: segments,
		Features: features,
	}, nil
}
