package filters_catalog

import (
	"testing"
	"time"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

func TestCatalogCacheGetSet(t *testing.T) {
	c := newCatalogCache(50 * time.Millisecond)
	key := eventsCatalogCacheKey(1, "web")

	if _, ok := c.get(key); ok {
		t.Fatalf("expected cache miss before set")
	}

	section := model.FilterSection{Total: 1, DisplayName: "Events"}
	c.set(key, section)

	got, ok := c.get(key)
	if !ok {
		t.Fatalf("expected cache hit after set")
	}
	if got.DisplayName != section.DisplayName {
		t.Errorf("got %+v, want %+v", got, section)
	}

	time.Sleep(60 * time.Millisecond)
	if _, ok := c.get(key); ok {
		t.Fatalf("expected cache miss after TTL expiry")
	}
}

func TestCatalogCacheInvalidate(t *testing.T) {
	c := newCatalogCache(time.Minute)

	eventsKey := eventsCatalogCacheKey(1, "web")
	propertiesKey := propertiesCatalogCacheKey(1)
	otherProjectKey := eventsCatalogCacheKey(2, "web")

	c.set(eventsKey, model.FilterSection{DisplayName: "Events"})
	c.set(propertiesKey, model.FilterSection{DisplayName: "Event Properties"})
	c.set(otherProjectKey, model.FilterSection{DisplayName: "Events"})

	c.invalidate(1)

	if _, ok := c.get(eventsKey); ok {
		t.Errorf("expected events entry to be invalidated")
	}
	if _, ok := c.get(propertiesKey); ok {
		t.Errorf("expected properties entry to be invalidated")
	}
	if _, ok := c.get(otherProjectKey); !ok {
		t.Errorf("expected other project entry to remain cached")
	}
}
