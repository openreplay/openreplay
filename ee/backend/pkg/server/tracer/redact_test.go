package tracer

import (
	"bytes"
	"encoding/json"
	"reflect"
	"testing"
)

func decodeExact(t *testing.T, data []byte) any {
	t.Helper()
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		t.Fatalf("invalid json %s: %s", data, err)
	}
	return v
}

func TestRedactPayload(t *testing.T) {
	tests := []struct {
		name string
		body string
		want string
	}{
		{"webhook auth header", `{"name":"ops","endpoint":"https://x.io","authHeader":"Bearer s3cret"}`, `{"authHeader":"HIDDEN","endpoint":"https://x.io","name":"ops"}`},
		{"nested and snake case", `{"config":{"api_key":"k","access-key":"a","items":[{"refresh_token":"t","n":1}]}}`, `{"config":{"access-key":"HIDDEN","api_key":"HIDDEN","items":[{"n":1,"refresh_token":"HIDDEN"}]}}`},
		{"credentials and passwords", `{"oldPassword":"a","Credential":"b","clientSecret":"c","keep":true}`, `{"Credential":"HIDDEN","clientSecret":"HIDDEN","keep":true,"oldPassword":"HIDDEN"}`},
		{"large numbers survive", `{"sessionId":7350815230184538734}`, `{"sessionId":7350815230184538734}`},
		{"empty body", ``, ``},
		{"not json is dropped", `password=hunter2`, ``},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := redactPayload([]byte(tt.body))
			if tt.want == "" {
				if got != nil {
					t.Fatalf("expected no payload, got %s", got)
				}
				return
			}
			if !reflect.DeepEqual(decodeExact(t, got), decodeExact(t, []byte(tt.want))) {
				t.Fatalf("got %s, want %s", got, tt.want)
			}
		})
	}
}

func TestRedactQueryParameters(t *testing.T) {
	params := map[string]any{"token": "abc", "page": "2", "key": []string{"a", "b"}}
	redactValue(params)
	if params["token"] != hiddenValue || params["page"] != "2" {
		t.Fatalf("unexpected params: %v", params)
	}
}
