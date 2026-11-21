package web

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	httpCfg "openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/ipfilter"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/pkg/logger"
	webmetrics "openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
)

type fakeProjects struct {
	projects.Projects
}

func (fakeProjects) GetProjectByKey(string) (*projects.Project, error) {
	return &projects.Project{ProjectID: 1, Platform: "web", SampleRate: 100}, nil
}

type rejectRecorder struct {
	webmetrics.Web
	reasons []string
}

func (m *rejectRecorder) IncreaseStartRejects(_, reason string) {
	m.reasons = append(m.reasons, reason)
}
func (m *rejectRecorder) RecordRequestSize(float64, string, int)     {}
func (m *rejectRecorder) RecordRequestDuration(float64, string, int) {}

func TestStartSessionHandlerWebExcludedIPs(t *testing.T) {
	regexFile := filepath.Join(t.TempDir(), "regexes.yaml")
	if err := os.WriteFile(regexFile, []byte("{}"), 0o600); err != nil {
		t.Fatal(err)
	}
	uaParser, err := uaparser.NewUAParser(regexFile)
	if err != nil {
		t.Fatal(err)
	}
	excludeIPs, err := ipfilter.New("203.0.113.0/24")
	if err != nil {
		t.Fatal(err)
	}

	// Requests carry no User-Agent, so the first check after the IP one rejects them
	// with browser_unrecognized and nothing past that point needs to be set up.
	cases := []struct {
		name       string
		headers    map[string]string
		remoteAddr string
		wantReason string
	}{
		{"excluded X-Real-Ip", map[string]string{"X-Real-Ip": "203.0.113.7"}, "10.0.0.1:1234", webmetrics.RejectExcludedIP},
		{"excluded X-Forwarded-For", map[string]string{"X-Forwarded-For": "203.0.113.7, 10.0.0.2"}, "10.0.0.1:1234", webmetrics.RejectExcludedIP},
		{"excluded remote address", nil, "203.0.113.7:1234", webmetrics.RejectExcludedIP},
		{"other X-Real-Ip", map[string]string{"X-Real-Ip": "198.51.100.7"}, "203.0.113.7:1234", webmetrics.RejectBrowserUnrecognized},
		{"other remote address", nil, "198.51.100.7:1234", webmetrics.RejectBrowserUnrecognized},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			metrics := &rejectRecorder{}
			e := &handlersImpl{
				log:        logger.New(),
				cfg:        &httpCfg.Config{},
				responser:  api.NewResponser(metrics),
				projects:   fakeProjects{},
				uaParser:   uaParser,
				excludeIPs: excludeIPs,
				metrics:    metrics,
			}
			e.cfg.JsonSizeLimit = 1 << 20

			r := httptest.NewRequest(http.MethodPost, "/v1/web/start", strings.NewReader(`{"projectKey":"key","trackerVersion":"16.0.0"}`))
			r.Header.Del("User-Agent")
			for k, v := range tc.headers {
				r.Header.Set(k, v)
			}
			r.RemoteAddr = tc.remoteAddr
			w := httptest.NewRecorder()

			e.startSessionHandlerWeb(w, r)

			if w.Code != http.StatusForbidden {
				t.Errorf("status = %d, want %d", w.Code, http.StatusForbidden)
			}
			if len(metrics.reasons) != 1 || metrics.reasons[0] != tc.wantReason {
				t.Errorf("reject reasons = %v, want [%s]", metrics.reasons, tc.wantReason)
			}
			if strings.Contains(w.Body.String(), "203.0.113") {
				t.Errorf("response leaks the configured range: %s", w.Body.String())
			}
		})
	}
}
