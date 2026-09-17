package filters_catalog

import (
	"context"
	"fmt"
	"sync"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

func (s *filtersCatalogImpl) GetAllFilters(ctx context.Context, projectID uint32, userID uint64, platform string) (*model.AllFiltersResponse, error) {
	var (
		events, properties, metadata, segments, features model.FilterSection
		wg                                               sync.WaitGroup
		once                                             sync.Once
		firstErr                                         error
	)

	setErr := func(err error) {
		once.Do(func() {
			firstErr = err
		})
	}

	wg.Add(5)
	go func() {
		defer wg.Done()
		defer func() {
			if r := recover(); r != nil {
				setErr(fmt.Errorf("events catalog panic: %v", r))
			}
		}()
		v, err := s.getEventsCatalog(ctx, projectID, platform)
		if err != nil {
			setErr(fmt.Errorf("events catalog: %w", err))
			return
		}
		events = v
	}()
	go func() {
		defer wg.Done()
		defer func() {
			if r := recover(); r != nil {
				setErr(fmt.Errorf("properties catalog panic: %v", r))
			}
		}()
		v, err := s.getPropertiesCatalog(ctx, projectID)
		if err != nil {
			setErr(fmt.Errorf("properties catalog: %w", err))
			return
		}
		properties = v
	}()
	go func() {
		defer wg.Done()
		defer func() {
			if r := recover(); r != nil {
				setErr(fmt.Errorf("metadata catalog panic: %v", r))
			}
		}()
		v, err := s.getMetadataFilters(ctx, projectID)
		if err != nil {
			setErr(fmt.Errorf("metadata catalog: %w", err))
			return
		}
		metadata = v
	}()
	go func() {
		defer wg.Done()
		defer func() {
			if r := recover(); r != nil {
				setErr(fmt.Errorf("segments catalog panic: %v", r))
			}
		}()
		v, err := s.getSegmentsFilters(ctx, projectID, userID)
		if err != nil {
			setErr(fmt.Errorf("segments catalog: %w", err))
			return
		}
		segments = v
	}()
	go func() {
		defer wg.Done()
		defer func() {
			if r := recover(); r != nil {
				setErr(fmt.Errorf("features catalog panic: %v", r))
			}
		}()
		v, err := s.getFeaturesFilters(ctx, projectID)
		if err != nil {
			setErr(fmt.Errorf("features catalog: %w", err))
			return
		}
		features = v
	}()
	wg.Wait()

	if firstErr != nil {
		return nil, firstErr
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
