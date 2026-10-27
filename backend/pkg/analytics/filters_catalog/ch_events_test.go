package filters_catalog

import (
	"testing"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

func TestEventsCatalogHidesScrollDepth(t *testing.T) {
	section := buildEventsCatalogSection([]eventCatalogRow{
		{Total: 3, Name: "CLICK", AutoCaptured: true},
		{Total: 3, Name: "SCROLL", AutoCaptured: true},
		{Total: 3, Name: "SCROLL", AutoCaptured: false},
	}, "web")

	var scrolls []model.EventCatalogItem
	for _, item := range section.List {
		if ev := item.(model.EventCatalogItem); ev.Name == "SCROLL" {
			scrolls = append(scrolls, ev)
		}
	}
	if len(scrolls) != 1 || scrolls[0].AutoCaptured {
		t.Errorf("got %+v, want only the custom SCROLL event", scrolls)
	}
}
