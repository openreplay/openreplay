package api

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"sort"
	"strconv"
	"time"
)

var errEmptyJSONLogs = errors.New("no log records in the request")

type otlpAnyValue struct {
	StringValue *string  `json:"stringValue,omitempty"`
	BoolValue   *bool    `json:"boolValue,omitempty"`
	IntValue    *string  `json:"intValue,omitempty"`
	DoubleValue *float64 `json:"doubleValue,omitempty"`
}

type otlpKeyValue struct {
	Key   string       `json:"key"`
	Value otlpAnyValue `json:"value"`
}

type otlpLogRecord struct {
	TimeUnixNano   string         `json:"timeUnixNano"`
	SeverityNumber int            `json:"severityNumber,omitempty"`
	SeverityText   string         `json:"severityText,omitempty"`
	Body           *otlpAnyValue  `json:"body,omitempty"`
	Attributes     []otlpKeyValue `json:"attributes,omitempty"`
	Flags          uint32         `json:"flags,omitempty"`
	TraceID        string         `json:"traceId,omitempty"`
	SpanID         string         `json:"spanId,omitempty"`
}

type otlpScopeLogs struct {
	LogRecords []otlpLogRecord `json:"logRecords"`
}

type otlpResource struct {
	Attributes []otlpKeyValue `json:"attributes,omitempty"`
}

type otlpResourceLogs struct {
	Resource  otlpResource    `json:"resource"`
	ScopeLogs []otlpScopeLogs `json:"scopeLogs"`
}

type otlpLogsRequest struct {
	ResourceLogs []*otlpResourceLogs `json:"resourceLogs"`
}

func convertJSONLogs(payload []byte, now time.Time) ([]byte, error) {
	records, err := decodeJSONRecords(payload)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, errEmptyJSONLogs
	}
	req := otlpLogsRequest{}
	byResource := map[string]*otlpResourceLogs{}
	for _, rec := range records {
		resources, _ := rec["resources"].(map[string]any)
		resKey, err := json.Marshal(resources)
		if err != nil {
			return nil, err
		}
		rl, ok := byResource[string(resKey)]
		if !ok {
			rl = &otlpResourceLogs{Resource: otlpResource{Attributes: keyValues(resources)}, ScopeLogs: []otlpScopeLogs{{}}}
			byResource[string(resKey)] = rl
			req.ResourceLogs = append(req.ResourceLogs, rl)
		}
		rl.ScopeLogs[0].LogRecords = append(rl.ScopeLogs[0].LogRecords, logRecord(rec, now))
	}
	return json.Marshal(req)
}

func decodeJSONRecords(payload []byte) ([]map[string]any, error) {
	dec := json.NewDecoder(bytes.NewReader(payload))
	dec.UseNumber()
	var records []map[string]any
	for {
		var v any
		err := dec.Decode(&v)
		if errors.Is(err, io.EOF) {
			return records, nil
		}
		if err != nil {
			return nil, fmt.Errorf("invalid JSON: %w", err)
		}
		switch t := v.(type) {
		case map[string]any:
			records = append(records, t)
		case []any:
			for _, item := range t {
				rec, ok := item.(map[string]any)
				if !ok {
					return nil, errors.New("every log record must be a JSON object")
				}
				records = append(records, rec)
			}
		default:
			return nil, errors.New("expected a JSON array of log records or JSON objects")
		}
	}
}

func logRecord(rec map[string]any, now time.Time) otlpLogRecord {
	out := otlpLogRecord{TimeUnixNano: strconv.FormatInt(now.UnixNano(), 10)}
	attrs := map[string]any{}
	for key, value := range rec {
		switch key {
		case "timestamp":
			if ns, ok := timestampNanos(value); ok {
				out.TimeUnixNano = strconv.FormatInt(ns, 10)
			} else {
				attrs[key] = value
			}
		case "trace_id", "traceId":
			if id, ok := hexID(value, 16); ok {
				out.TraceID = id
			} else {
				attrs[key] = value
			}
		case "span_id", "spanId":
			if id, ok := hexID(value, 8); ok {
				out.SpanID = id
			} else {
				attrs[key] = value
			}
		case "trace_flags":
			if n, ok := intInRange(value, 0, math.MaxUint32); ok {
				out.Flags = uint32(n)
			} else {
				attrs[key] = value
			}
		case "severity_text":
			if s, ok := value.(string); ok {
				out.SeverityText = s
			} else {
				attrs[key] = value
			}
		case "severity_number":
			if n, ok := intInRange(value, 1, 24); ok {
				out.SeverityNumber = int(n)
			} else {
				attrs[key] = value
			}
		case "attributes", "resources", "body", "message":
		default:
			attrs[key] = value
		}
	}
	if explicit, ok := rec["attributes"].(map[string]any); ok {
		for key, value := range explicit {
			attrs[key] = value
		}
	} else if v, present := rec["attributes"]; present {
		attrs["attributes"] = v
	}
	if v, present := rec["resources"]; present {
		if _, ok := v.(map[string]any); !ok {
			attrs["resources"] = v
		}
	}
	body, message := rec["body"], rec["message"]
	hasBody, hasMessage := body != nil, message != nil
	switch {
	case hasBody:
		value := anyValue(body)
		out.Body = &value
		if hasMessage {
			attrs["message"] = message
		}
	case hasMessage:
		value := anyValue(message)
		out.Body = &value
	}
	out.Attributes = keyValues(attrs)
	return out
}

func timestampNanos(v any) (int64, bool) {
	switch t := v.(type) {
	case json.Number:
		if n, err := t.Int64(); err == nil {
			if n <= 0 {
				return 0, false
			}
			scale := unixScale(float64(n))
			if n > math.MaxInt64/scale {
				return 0, false
			}
			return n * scale, true
		}
		if f, err := t.Float64(); err == nil && f > 0 && !math.IsInf(f, 0) {
			ns := f * float64(unixScale(f))
			if ns < math.MaxInt64 {
				return int64(ns), true
			}
		}
	case string:
		if ts, err := time.Parse(time.RFC3339Nano, t); err == nil {
			return ts.UnixNano(), true
		}
		return timestampNanos(json.Number(t))
	}
	return 0, false
}

func unixScale(v float64) int64 {
	switch {
	case v < 1e11:
		return 1e9
	case v < 1e14:
		return 1e6
	case v < 1e17:
		return 1e3
	}
	return 1
}

func hexID(v any, size int) (string, bool) {
	s, ok := v.(string)
	if !ok || len(s) != size*2 {
		return "", false
	}
	raw, err := hex.DecodeString(s)
	if err != nil || bytes.Equal(raw, make([]byte, size)) {
		return "", false
	}
	return s, true
}

func intInRange(v any, lo, hi int64) (int64, bool) {
	n, ok := v.(json.Number)
	if !ok {
		return 0, false
	}
	i, err := n.Int64()
	if err != nil || i < lo || i > hi {
		return 0, false
	}
	return i, true
}

func keyValues(m map[string]any) []otlpKeyValue {
	if len(m) == 0 {
		return nil
	}
	keys := make([]string, 0, len(m))
	for key, value := range m {
		if value != nil {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	out := make([]otlpKeyValue, 0, len(keys))
	for _, key := range keys {
		out = append(out, otlpKeyValue{Key: key, Value: anyValue(m[key])})
	}
	return out
}

func anyValue(v any) otlpAnyValue {
	switch t := v.(type) {
	case string:
		return otlpAnyValue{StringValue: &t}
	case bool:
		return otlpAnyValue{BoolValue: &t}
	case json.Number:
		if _, err := t.Int64(); err == nil {
			s := t.String()
			return otlpAnyValue{IntValue: &s}
		}
		if f, err := t.Float64(); err == nil && !math.IsInf(f, 0) {
			return otlpAnyValue{DoubleValue: &f}
		}
		s := t.String()
		return otlpAnyValue{StringValue: &s}
	}
	raw, err := json.Marshal(v)
	if err != nil {
		raw = []byte("null")
	}
	s := string(raw)
	return otlpAnyValue{StringValue: &s}
}
