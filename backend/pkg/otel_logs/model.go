package otel_logs

type AttributeFilter struct {
	Scope  string   `json:"scope"`
	Key    string   `json:"key"`
	Op     string   `json:"op"`
	Values []string `json:"values"`
}

type Filter struct {
	StartTime  int64             `json:"startTime"`
	EndTime    int64             `json:"endTime"`
	Query      string            `json:"query"`
	Services   []string          `json:"services"`
	Severities []string          `json:"severities"`
	Attributes []AttributeFilter `json:"attributes"`
}

type SearchRequest struct {
	Filter
	Limit  int    `json:"limit"`
	Cursor string `json:"cursor"`
}

type FacetsRequest struct {
	Filter
	Key   string `json:"key"`
	Scope string `json:"scope"`
}

type Log struct {
	Timestamp          int64             `json:"timestamp"`
	SeverityText       string            `json:"severityText"`
	SeverityNumber     uint8             `json:"severityNumber"`
	ServiceName        string            `json:"serviceName"`
	Body               string            `json:"body"`
	TraceID            string            `json:"traceId"`
	SpanID             string            `json:"spanId"`
	LogAttributes      map[string]string `json:"logAttributes"`
	ResourceAttributes map[string]string `json:"resourceAttributes"`
	ScopeName          string            `json:"scopeName"`
	ScopeAttributes    map[string]string `json:"scopeAttributes"`
}

type SearchResponse struct {
	Logs       []Log   `json:"logs"`
	NextCursor *string `json:"nextCursor"`
}

type Bucket struct {
	Time       int64             `json:"time"`
	Total      uint64            `json:"total"`
	BySeverity map[string]uint64 `json:"bySeverity"`
}

type HistogramResponse struct {
	Step    int64    `json:"step"`
	Buckets []Bucket `json:"buckets"`
}

type ValueCount struct {
	Value string `json:"value"`
	Count uint64 `json:"count"`
}

type KeyCount struct {
	Key   string `json:"key"`
	Count uint64 `json:"count"`
}

type FacetsResponse struct {
	Services      []ValueCount          `json:"services"`
	Severities    []ValueCount          `json:"severities"`
	AttributeKeys map[string][]KeyCount `json:"attributeKeys"`
	Sampled       bool                  `json:"sampled"`
}

type FacetValuesResponse struct {
	Key     string       `json:"key"`
	Values  []ValueCount `json:"values"`
	Sampled bool         `json:"sampled"`
}
