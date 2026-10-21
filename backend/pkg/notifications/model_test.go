package notifications

import (
	"encoding/json"
	"testing"
)

func TestViewRequestNormalize(t *testing.T) {
	tests := []struct {
		name      string
		body      string
		wantErr   bool
		wantStart *int64
		wantEnd   *int64
		wantIDs   int
	}{
		{name: "ids only", body: `{"ids":[1,2,3]}`, wantIDs: 3},
		{name: "timestamps", body: `{"startTimestamp":10,"endTimestamp":20}`, wantStart: i64(10), wantEnd: i64(20)},
		{name: "date aliases", body: `{"startDate":5,"endDate":6}`, wantStart: i64(5), wantEnd: i64(6)},
		{name: "timestamp wins over alias", body: `{"startTimestamp":1,"startDate":5,"endTimestamp":7,"endDate":6}`, wantStart: i64(1), wantEnd: i64(7)},
		{name: "end only", body: `{"endTimestamp":20}`, wantEnd: i64(20)},
		{name: "empty", body: `{}`},
		{name: "negative start", body: `{"startTimestamp":-1,"endTimestamp":20}`, wantErr: true},
		{name: "negative end", body: `{"endTimestamp":-1}`, wantErr: true},
		{name: "id out of int4 range", body: `{"ids":[1,99999999999]}`, wantErr: true},
		{name: "start after end", body: `{"startTimestamp":30,"endTimestamp":20}`, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &ViewRequest{}
			if err := json.Unmarshal([]byte(tt.body), req); err != nil {
				t.Fatalf("unmarshal: %s", err)
			}
			err := req.Normalize()
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}
			if !eq(req.StartTimestamp, tt.wantStart) || !eq(req.EndTimestamp, tt.wantEnd) {
				t.Errorf("start/end = %v/%v, want %v/%v", deref(req.StartTimestamp), deref(req.EndTimestamp), deref(tt.wantStart), deref(tt.wantEnd))
			}
			if len(req.IDs) != tt.wantIDs {
				t.Errorf("ids = %d, want %d", len(req.IDs), tt.wantIDs)
			}
		})
	}
}

func i64(v int64) *int64 { return &v }

func eq(a, b *int64) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

func deref(v *int64) any {
	if v == nil {
		return nil
	}
	return *v
}
