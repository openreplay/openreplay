package lexicon

import (
	"context"
	"errors"
	"fmt"

	analyticsModel "openreplay/backend/pkg/analytics/model"
)

const maxFilterResolveDepth = 3

// FilterRef describes a kind of filter that references another set of filters
// (e.g. actions, segments) and knows how to expand itself.
type FilterRef interface {
	// RefID returns the reference ID on f, or "" if this ref doesn't apply.
	RefID(f analyticsModel.Filter) string
	// Expand returns the filters that refID expands into.
	Expand(ctx context.Context, projID uint32, refID string) ([]analyticsModel.Filter, error)
	// NotFound is the sentinel returned by Expand when refID is unknown.
	NotFound() error
	// Kind is used in error messages and cycle-detection keys.
	Kind() string
}

// ResolveFilters expands every referenced filter (via any of refs) in inputFilters,
// recursing up to maxFilterResolveDepth. Cycles are skipped.
func ResolveFilters(ctx context.Context, refs []FilterRef, projID uint32, inputFilters []analyticsModel.Filter) ([]analyticsModel.Filter, error) {
	if !hasRefFilters(refs, inputFilters) {
		return inputFilters, nil
	}
	return resolveFilters(ctx, refs, projID, inputFilters, 0, make(map[string]bool))
}

func hasRefFilters(refs []FilterRef, inputFilters []analyticsModel.Filter) bool {
	for i := range inputFilters {
		for _, r := range refs {
			if r.RefID(inputFilters[i]) != "" {
				return true
			}
		}
	}
	return false
}

func resolveFilters(ctx context.Context, refs []FilterRef, projID uint32, inputFilters []analyticsModel.Filter, depth int, seen map[string]bool) ([]analyticsModel.Filter, error) {
	if depth > maxFilterResolveDepth {
		return nil, nil
	}
	resolved := make([]analyticsModel.Filter, 0, len(inputFilters))
	for _, f := range inputFilters {
		var matched FilterRef
		var id string
		for _, r := range refs {
			if rid := r.RefID(f); rid != "" {
				matched = r
				id = rid
				break
			}
		}
		if matched == nil {
			resolved = append(resolved, f)
			continue
		}
		key := matched.Kind() + ":" + id
		if seen[key] {
			continue
		}
		seen[key] = true
		expanded, err := matched.Expand(ctx, projID, id)
		if err != nil {
			delete(seen, key)
			if errors.Is(err, matched.NotFound()) {
				return nil, fmt.Errorf("%s %s not found", matched.Kind(), id)
			}
			return nil, fmt.Errorf("failed to resolve %s %s: %w", matched.Kind(), id, err)
		}
		nested, err := resolveFilters(ctx, refs, projID, expanded, depth+1, seen)
		if err != nil {
			return nil, err
		}
		resolved = append(resolved, nested...)
		delete(seen, key)
	}
	return resolved, nil
}

// ResolveSessionSearch resolves ref filters on req.Filters and every series filter.
func ResolveSessionSearch(ctx context.Context, refs []FilterRef, projID uint32, req *analyticsModel.SessionsSearchRequest) error {
	resolved, err := ResolveFilters(ctx, refs, projID, req.Filters)
	if err != nil {
		return err
	}
	req.Filters = resolved
	for i, series := range req.Series {
		r, err := ResolveFilters(ctx, refs, projID, series.Filter.Filters)
		if err != nil {
			return err
		}
		req.Series[i].Filter.Filters = r
	}
	return nil
}

// ResolveMetricPayload resolves ref filters on every series filter, StartPoint, and Exclude.
func ResolveMetricPayload(ctx context.Context, refs []FilterRef, projID uint32, req *analyticsModel.MetricPayload) error {
	for i, series := range req.Series {
		r, err := ResolveFilters(ctx, refs, projID, series.Filter.Filters)
		if err != nil {
			return err
		}
		req.Series[i].Filter.Filters = r
	}
	r, err := ResolveFilters(ctx, refs, projID, req.StartPoint)
	if err != nil {
		return err
	}
	req.StartPoint = r
	r, err = ResolveFilters(ctx, refs, projID, req.Exclude)
	if err != nil {
		return err
	}
	req.Exclude = r
	return nil
}

// --- adapters ---

type segmentFilterRef struct{ segments Segments }

// NewSegmentFilterRef adapts a Segments provider to the FilterRef interface.
func NewSegmentFilterRef(s Segments) FilterRef { return &segmentFilterRef{segments: s} }

func (s *segmentFilterRef) RefID(f analyticsModel.Filter) string { return f.SearchId }
func (s *segmentFilterRef) NotFound() error                      { return ErrSegmentNotFound }
func (s *segmentFilterRef) Kind() string                         { return "segment" }

func (s *segmentFilterRef) Expand(ctx context.Context, projID uint32, refID string) ([]analyticsModel.Filter, error) {
	seg, err := s.segments.Get(ctx, projID, refID)
	if err != nil {
		return nil, err
	}
	return seg.Data.Filters, nil
}
