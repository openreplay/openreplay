package accounts

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
)

func strPtr(v string) *string { return &v }
func boolPtr(v bool) *bool    { return &v }
func intPtr(v int) *int       { return &v }

func TestAccountRequestNormalize(t *testing.T) {
	tests := []struct {
		name       string
		req        AccountRequest
		wantName   string
		wantTenant string
		wantErr    bool
	}{
		{"collapses whitespace", AccountRequest{Name: strPtr("  Ana   María "), TenantName: strPtr(" Acme  & Co ")}, "Ana María", "Acme & Co", false},
		{"unicode letters", AccountRequest{Name: strPtr("Zoë O'Brien-Łukasz"), TenantName: strPtr("株式会社")}, "Zoë O'Brien-Łukasz", "株式会社", false},
		{"empty strings are no-ops", AccountRequest{Name: strPtr("  "), TenantName: strPtr("")}, "", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := tt.req
			err := req.Normalize()
			if (err != nil) != tt.wantErr {
				t.Fatalf("got error %v, wantErr %v", err, tt.wantErr)
			}
			if err != nil {
				return
			}
			if req.Name != nil && *req.Name != tt.wantName {
				t.Fatalf("got name %q, want %q", *req.Name, tt.wantName)
			}
			if req.TenantName != nil && *req.TenantName != tt.wantTenant {
				t.Fatalf("got tenant %q, want %q", *req.TenantName, tt.wantTenant)
			}
		})
	}
}

func TestValidateAccountName(t *testing.T) {
	for _, ok := range []string{"Ana María", "Zoë O'Brien-Łukasz", "株式会社", "Acme & Co", "a.b@c"} {
		if err := validateAccountName("name", ok); err != nil {
			t.Fatalf("%q must be accepted: %s", ok, err)
		}
	}
	for _, bad := range []string{"<img src=x>", "Go API (OSS)", strings.Repeat("a", maxNameLength+1)} {
		if err := validateAccountName("name", bad); err == nil {
			t.Fatalf("%q must be rejected", bad)
		}
	}
}

func TestScopeRequest(t *testing.T) {
	tests := []struct {
		req     ScopeRequest
		want    int
		wantErr bool
	}{
		{ScopeRequest{}, 0, true},
		{ScopeRequest{Scope: intPtr(2)}, 2, false},
		{ScopeRequest{Scope: intPtr(0)}, 0, true},
		{ScopeRequest{Scope: intPtr(3)}, 0, true},
	}
	for _, tt := range tests {
		got, err := tt.req.Value()
		if (err != nil) != tt.wantErr || got != tt.want {
			t.Fatalf("scope %v: got (%d, %v), want %d wantErr %v", tt.req.Scope, got, err, tt.want, tt.wantErr)
		}
	}
}

func TestWeeklyReportValue(t *testing.T) {
	tests := []struct {
		body    string
		want    bool
		wantErr bool
	}{
		{`{}`, true, false},
		{`{"weeklyReport":false}`, false, false},
		{`{"weeklyReport":true}`, true, false},
		{`{"weeklyReport":null}`, false, true},
		{`{"weeklyReport":"yes"}`, false, true},
	}
	for _, tt := range tests {
		req := &WeeklyReportRequest{}
		if err := json.Unmarshal([]byte(tt.body), req); err != nil {
			t.Fatalf("%s: unmarshal: %s", tt.body, err)
		}
		got, err := req.Value()
		if (err != nil) != tt.wantErr || got != tt.want {
			t.Fatalf("%s: got (%v, %v), want %v wantErr %v", tt.body, got, err, tt.want, tt.wantErr)
		}
	}
}

func TestModuleRequestValidate(t *testing.T) {
	if err := (&ModuleRequest{Module: "assist", Status: boolPtr(true)}).Validate(); err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	if err := (&ModuleRequest{Module: "billing", Status: boolPtr(true)}).Validate(); err == nil {
		t.Fatalf("unknown module must be rejected")
	}
	if err := (&ModuleRequest{Module: "alerts"}).Validate(); err == nil {
		t.Fatalf("missing status must be rejected")
	}
}

func TestParseSettings(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want map[string]any
	}{
		{"null column", "", map[string]any{"modules": []any{}}},
		{"not an object", `["assist"]`, map[string]any{"modules": []any{}}},
		{"empty modules", `{"modules":null,"theme":"dark"}`, map[string]any{"modules": []any{}, "theme": "dark"}},
		{"keeps modules", `{"modules":["assist"]}`, map[string]any{"modules": []any{"assist"}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := parseSettings([]byte(tt.raw)); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestApplyModule(t *testing.T) {
	settings := map[string]any{"modules": []any{"usability-tests"}, "other": 1.0}
	settings = applyModule(settings, "assist", true)
	settings = applyModule(settings, "assist", true)
	if want := []any{"usability-tests", "assist"}; !reflect.DeepEqual(settings["modules"], want) {
		t.Fatalf("got %v, want %v", settings["modules"], want)
	}
	settings = applyModule(settings, "usability-tests", false)
	settings = applyModule(settings, "alerts", false)
	if want := []any{"assist"}; !reflect.DeepEqual(settings["modules"], want) {
		t.Fatalf("got %v, want %v", settings["modules"], want)
	}
	if settings["other"] != 1.0 {
		t.Fatalf("unrelated settings must be kept")
	}
}

func TestGenerateAPIKey(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 50; i++ {
		key, err := generateAPIKey()
		if err != nil {
			t.Fatalf("unexpected error: %s", err)
		}
		if len(key) != apiKeyLength || strings.Trim(key, apiKeyAlphabet) != "" {
			t.Fatalf("invalid key %q", key)
		}
		if seen[key] {
			t.Fatalf("duplicate key %q", key)
		}
		seen[key] = true
	}
}

func TestAccountJSONHidesKeysWhenNil(t *testing.T) {
	account := &Account{
		userInfo:   userInfo{UserID: 3, Settings: map[string]any{"modules": []any{}}},
		tenantInfo: tenantInfo{TenantID: 1, TenantName: "Acme", Edition: edition},
	}
	body, err := json.Marshal(account)
	if err != nil {
		t.Fatalf("marshal: %s", err)
	}
	var fields map[string]any
	if err := json.Unmarshal(body, &fields); err != nil {
		t.Fatalf("unmarshal: %s", err)
	}
	for _, key := range []string{"apiKey", "tenantKey"} {
		if _, ok := fields[key]; ok {
			t.Fatalf("%s must be omitted when not set: %s", key, body)
		}
	}
	for _, key := range []string{"userId", "tenantId", "tenantName", "settings", "smtp", "expirationDate", "hasActivePlan", "scopeState"} {
		if _, ok := fields[key]; !ok {
			t.Fatalf("%s must be present: %s", key, body)
		}
	}
}
