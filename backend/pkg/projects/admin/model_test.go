package admin

import (
	"strings"
	"testing"
)

func intPtr(v int) *int       { return &v }
func boolPtr(v bool) *bool    { return &v }
func strPtr(v string) *string { return &v }

func TestProjectRequestNormalize(t *testing.T) {
	tests := []struct {
		name     string
		req      ProjectRequest
		create   bool
		wantName string
		wantPlat string
		wantErr  string
	}{
		{"collapses whitespace", ProjectRequest{Name: "  my   site "}, true, "my site", "web", ""},
		{"keeps platform on update", ProjectRequest{Name: "site"}, false, "site", "", ""},
		{"accepts ios", ProjectRequest{Name: "app", Platform: "ios"}, true, "app", "ios", ""},
		{"accepts allowed punctuation", ProjectRequest{Name: "Café-1 & co/x_y.z#'@:,|"}, true, "Café-1 & co/x_y.z#'@:,|", "web", ""},
		{"rejects empty", ProjectRequest{Name: "   "}, true, "", "", "name is required"},
		{"rejects markup", ProjectRequest{Name: "<script>"}, true, "", "", "name contains invalid characters"},
		{"rejects android", ProjectRequest{Name: "app", Platform: "android"}, true, "", "", "platform must be one of: web, ios"},
		{"rejects long name", ProjectRequest{Name: strings.Repeat("a", maxProjectNameLength+1)}, true, "", "", "name must be at most 200 characters"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := tt.req
			err := req.Normalize(tt.create)
			if tt.wantErr != "" {
				if err == nil || err.Error() != tt.wantErr {
					t.Fatalf("got error %v, want %q", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}
			if req.Name != tt.wantName || req.Platform != tt.wantPlat {
				t.Fatalf("got (%q, %q), want (%q, %q)", req.Name, req.Platform, tt.wantName, tt.wantPlat)
			}
		})
	}
}

func TestCaptureRateRequest(t *testing.T) {
	tests := []struct {
		name     string
		req      CaptureRateRequest
		wantRate int
		wantErr  bool
	}{
		{"uses rate", CaptureRateRequest{Rate: intPtr(30)}, 30, false},
		{"capture all forces 100", CaptureRateRequest{Rate: intPtr(30), CaptureAll: true}, 100, false},
		{"missing rate", CaptureRateRequest{}, 0, true},
		{"above range", CaptureRateRequest{Rate: intPtr(101)}, 0, true},
		{"below range", CaptureRateRequest{Rate: intPtr(-1)}, 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("got error %v, wantErr %v", err, tt.wantErr)
			}
			if err == nil && tt.req.SampleRate() != tt.wantRate {
				t.Fatalf("got rate %d, want %d", tt.req.SampleRate(), tt.wantRate)
			}
		})
	}
}

func TestGDPRRequestValidate(t *testing.T) {
	valid := func() GDPRRequest {
		return GDPRRequest{MaskEmails: boolPtr(true), SampleRate: intPtr(33), MaskNumbers: boolPtr(false), DefaultInputMode: strPtr("obscured")}
	}
	tests := []struct {
		name    string
		mutate  func(r *GDPRRequest)
		wantErr string
	}{
		{"valid", func(r *GDPRRequest) {}, ""},
		{"missing maskEmails", func(r *GDPRRequest) { r.MaskEmails = nil }, "maskEmails is required"},
		{"missing defaultInputMode", func(r *GDPRRequest) { r.DefaultInputMode = nil }, "defaultInputMode is required"},
		{"unknown input mode", func(r *GDPRRequest) { r.DefaultInputMode = strPtr("visible") }, "defaultInputMode must be one of: plain, obscured, hidden"},
		{"sample rate out of range", func(r *GDPRRequest) { r.SampleRate = intPtr(150) }, "sampleRate must be between 0 and 100"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := valid()
			tt.mutate(&req)
			err := req.Validate()
			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("unexpected error: %s", err)
				}
				return
			}
			if err == nil || err.Error() != tt.wantErr {
				t.Fatalf("got error %v, want %q", err, tt.wantErr)
			}
		})
	}
}

func TestMetadataRequestNormalize(t *testing.T) {
	tests := []struct {
		name    string
		key     string
		want    string
		wantErr bool
	}{
		{"trims", "  user  id ", "user id", false},
		{"empty", "   ", "", true},
		{"too long", strings.Repeat("k", maxMetadataKeyLength+1), "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := MetadataRequest{Key: tt.key}
			err := req.Normalize()
			if (err != nil) != tt.wantErr {
				t.Fatalf("got error %v, wantErr %v", err, tt.wantErr)
			}
			if err == nil && req.Key != tt.want {
				t.Fatalf("got %q, want %q", req.Key, tt.want)
			}
		})
	}
}

func TestMetadataHelpers(t *testing.T) {
	var keys [maxMetadataKeys]*string
	keys[0] = strPtr("userId")
	keys[3] = strPtr("Plan")

	list := metadataList(keys)
	if len(list) != 2 || *list[0] != (MetadataKey{Key: "userId", Index: 1}) || *list[1] != (MetadataKey{Key: "Plan", Index: 4}) {
		t.Fatalf("unexpected list: %+v %+v", list[0], list[1])
	}
	if len(metadataList([maxMetadataKeys]*string{})) != 0 || metadataList([maxMetadataKeys]*string{}) == nil {
		t.Fatalf("empty metadata must be an empty, non-nil list")
	}
	if !metadataKeyExists(keys, "plan", 0) {
		t.Fatalf("key comparison must be case-insensitive")
	}
	if metadataKeyExists(keys, "plan", 4) {
		t.Fatalf("excluded index must be ignored")
	}
	for _, idx := range []int{0, 11, -1} {
		if ValidMetadataIndex(idx) {
			t.Fatalf("index %d must be invalid", idx)
		}
	}
}
