package charts

import (
	"testing"
)

func TestGetTableBreakdownProjection_InvalidBreakdown(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("GetTableBreakdownProjection panicked on invalid input: %v", r)
		}
	}()
	result := GetTableBreakdownProjection([]string{"invalidDimension"})
	if len(result) != 0 {
		t.Errorf("expected empty result for invalid breakdown, got %v", result)
	}
}

func TestGetFunnelBreakdownProjection_InvalidBreakdown(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("GetFunnelBreakdownProjection panicked on invalid input: %v", r)
		}
	}()
	result := GetFunnelBreakdownProjection([]string{"invalidDimension"})
	if len(result) != 0 {
		t.Errorf("expected empty result for invalid breakdown, got %v", result)
	}
}
