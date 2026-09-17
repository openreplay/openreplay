package model

type PredefinedProperty struct {
	Type           string
	IsPredefined   bool
	PossibleValues []any
	IsConditional  bool
}

var PredefinedProperties = map[string]PredefinedProperty{
	"label":                       {Type: "String", IsConditional: true},
	"hesitation_time":             {Type: "UInt32"},
	"name":                        {Type: "String", IsConditional: true},
	"payload":                     {Type: "String"},
	"level":                       {Type: "Enum8"},
	"message":                     {Type: "String"},
	"context":                     {Type: "Enum8"},
	"url_host":                    {Type: "String", IsConditional: true},
	"url_path":                    {Type: "String", IsConditional: true},
	"first_contentful_paint_time": {Type: "UInt16"},
	"speed_index":                 {Type: "UInt16"},
	"min_fps":                     {Type: "UInt8"},
	"max_fps":                     {Type: "UInt8"},
	"min_cpu":                     {Type: "UInt8"},
	"max_cpu":                     {Type: "UInt8"},
	"min_used_js_heap_size":       {Type: "UInt64"},
	"max_used_js_heap_size":       {Type: "UInt64"},
	"method": {
		Type:           "Enum8",
		IsPredefined:   true,
		PossibleValues: []any{"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTION"},
		IsConditional:  true,
	},
	"status":        {Type: "UInt16", IsConditional: true},
	"success":       {Type: "UInt8"},
	"request_body":  {Type: "String"},
	"response_body": {Type: "String"},
	"selector":      {Type: "String", IsConditional: true},
	"duration":      {Type: "UInt16", IsConditional: true},
	"normalized_x":  {Type: "UInt16", IsConditional: true},
	"normalized_y":  {Type: "UInt16", IsConditional: true},
}

var PredefinedPropertiesOrder = []string{
	"label", "hesitation_time", "name", "payload", "level", "message", "context",
	"url_host", "url_path", "first_contentful_paint_time", "speed_index",
	"min_fps", "max_fps", "min_cpu", "max_cpu",
	"min_used_js_heap_size", "max_used_js_heap_size",
	"method", "status", "success", "request_body", "response_body",
	"selector", "duration", "normalized_x", "normalized_y",
}

func KeyToSnakeCase(s string) string {
	if s == "" {
		return s
	}
	var b []byte
	for i := 0; i < len(s); i++ {
		r := s[i]
		if i > 0 && r >= 'A' && r <= 'Z' {
			b = append(b, '_')
		}
		if r >= 'A' && r <= 'Z' {
			r = r + ('a' - 'A')
		}
		b = append(b, r)
	}
	return string(b)
}

func StoredPropertyKey(name string) string {
	snake := KeyToSnakeCase(name)
	if _, ok := PredefinedProperties[snake]; ok {
		return snake
	}
	return name
}
