package filters_catalog

import "testing"

func TestStoredPropertyKey(t *testing.T) {
	cases := []struct {
		name string
		want string
	}{
		{"hesitationTime", "hesitation_time"},
		{"hesitation_time", "hesitation_time"},
		{"minUsedJsHeapSize", "min_used_js_heap_size"},
		{"apiURL", "apiURL"},
		{"pageTitle", "pageTitle"},
		{"label", "label"},
	}
	for _, c := range cases {
		if got := StoredPropertyKey(c.name); got != c.want {
			t.Errorf("StoredPropertyKey(%q) = %q, want %q", c.name, got, c.want)
		}
	}
}
