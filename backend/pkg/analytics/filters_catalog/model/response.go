package model

// StaticFilterItem is the uniform 9-field shape used by sessions, users,
// and identified-users sections. All fields always present.
type StaticFilterItem struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	DisplayName    string   `json:"displayName"`
	PossibleTypes  []string `json:"possibleTypes"`
	DataType       string   `json:"dataType"`
	AutoCaptured   bool     `json:"autoCaptured"`
	IsPredefined   bool     `json:"isPredefined"`
	PossibleValues []any    `json:"possibleValues"`
	IsConditional  bool     `json:"isConditional"`
}

// EventCatalogItem is the events-section shape: 8 fields, never includes
// isPredefined or possibleValues. _foundInPredefinedList serializes as a
// snake-style key with leading underscore (matches the golden).
type EventCatalogItem struct {
	Name                  string   `json:"name"`
	DisplayName           string   `json:"displayName"`
	AutoCaptured          bool     `json:"autoCaptured"`
	ID                    string   `json:"id"`
	DataType              string   `json:"dataType"`
	PossibleTypes         []string `json:"possibleTypes"`
	IsConditional         bool     `json:"isConditional"`
	FoundInPredefinedList bool     `json:"_foundInPredefinedList"`
}

// MetadataItem is the metadata-section shape: 6 fields. No isPredefined,
// possibleValues, or isConditional.
type MetadataItem struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	DisplayName   string   `json:"displayName"`
	PossibleTypes []string `json:"possibleTypes"`
	DataType      string   `json:"dataType"`
	AutoCaptured  bool     `json:"autoCaptured"`
}

// SegmentItem is the segments-section shape.
type SegmentItem struct {
	SearchID    string `json:"searchId"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	IsPublic    bool   `json:"isPublic"`
	IsSegment   bool   `json:"isSegment"`
}

// FeatureItem is the features-section shape. Location is omitempty —
// the golden's items don't include it.
type FeatureItem struct {
	TagID           int     `json:"tagId"`
	Name            string  `json:"name"`
	DisplayName     string  `json:"displayName"`
	Selector        string  `json:"selector"`
	IgnoreClickRage bool    `json:"ignoreClickRage"`
	IgnoreDeadClick bool    `json:"ignoreDeadClick"`
	Location        *string `json:"location,omitempty"`
	IsFeature       bool    `json:"isFeature"`
}

// FilterSection wraps any of the per-section item types. List is []any
// so each section can hold its own item type.
type FilterSection struct {
	Total       int      `json:"total"`
	DisplayName string   `json:"displayName"`
	Scope       []string `json:"scope"`
	List        []any    `json:"list"`
}

// AllFiltersResponse is the eight-bucket response envelope (without the
// outer {"data": ...} wrapper — that gets added by the handler).
type AllFiltersResponse struct {
	Events   FilterSection `json:"events"`
	Event    FilterSection `json:"event"`
	Session  FilterSection `json:"session"`
	User     FilterSection `json:"user"`
	Users    FilterSection `json:"users"`
	Metadata FilterSection `json:"metadata"`
	Segments FilterSection `json:"segments"`
	Features FilterSection `json:"features"`
}
