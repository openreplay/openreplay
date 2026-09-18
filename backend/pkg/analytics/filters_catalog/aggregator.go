package filters_catalog

import (
	"context"
	"fmt"
	"sync"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

type labeledFilterFunc struct {
	label string
	fn    func(ctx context.Context) error
}

func runCancelOnFirstError(parent context.Context, fns ...labeledFilterFunc) error {
	ctx, cancel := context.WithCancel(parent)
	defer cancel()

	var (
		wg       sync.WaitGroup
		once     sync.Once
		firstErr error
	)
	fail := func(err error) {
		once.Do(func() {
			firstErr = err
		})
		cancel()
	}

	wg.Add(len(fns))
	for _, f := range fns {
		go func(f labeledFilterFunc) {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					fail(fmt.Errorf("%s panic: %v", f.label, r))
				}
			}()
			if err := f.fn(ctx); err != nil {
				fail(err)
			}
		}(f)
	}
	wg.Wait()

	return firstErr
}

func (s *filtersCatalogImpl) GetAllFilters(ctx context.Context, projectID uint32, userID uint64, platform string) (*model.AllFiltersResponse, error) {
	var events, properties, metadata, segments, features model.FilterSection

	err := runCancelOnFirstError(ctx,
		labeledFilterFunc{"events catalog", func(ctx context.Context) error {
			v, err := s.getEventsCatalog(ctx, projectID, platform)
			if err != nil {
				return fmt.Errorf("events catalog: %w", err)
			}
			events = v
			return nil
		}},
		labeledFilterFunc{"properties catalog", func(ctx context.Context) error {
			v, err := s.getPropertiesCatalog(ctx, projectID)
			if err != nil {
				return fmt.Errorf("properties catalog: %w", err)
			}
			properties = v
			return nil
		}},
		labeledFilterFunc{"metadata catalog", func(ctx context.Context) error {
			v, err := s.getMetadataFilters(ctx, projectID)
			if err != nil {
				return fmt.Errorf("metadata catalog: %w", err)
			}
			metadata = v
			return nil
		}},
		labeledFilterFunc{"segments catalog", func(ctx context.Context) error {
			v, err := s.getSegmentsFilters(ctx, projectID, userID)
			if err != nil {
				return fmt.Errorf("segments catalog: %w", err)
			}
			segments = v
			return nil
		}},
		labeledFilterFunc{"features catalog", func(ctx context.Context) error {
			v, err := s.getFeaturesFilters(ctx, projectID)
			if err != nil {
				return fmt.Errorf("features catalog: %w", err)
			}
			features = v
			return nil
		}},
	)
	if err != nil {
		return nil, err
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
