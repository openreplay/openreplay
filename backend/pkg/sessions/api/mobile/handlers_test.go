package mobile

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	httpCfg "openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/ipfilter"
	"openreplay/backend/pkg/logger"
	webmetrics "openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
)

type fakeProjects struct {
	projects.Projects
}

func (fakeProjects) GetProjectByKey(string) (*projects.Project, error) {
	return &projects.Project{ProjectID: 1, Platform: "ios", SampleRate: 100}, nil
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

func TestStartMobileSessionHandlerExcludedIPs(t *testing.T) {
	excludeIPs, err := ipfilter.New("203.0.113.0/24")
	if err != nil {
		t.Fatal(err)
	}

	// Requests carry an outdated tracker version, so the first check after the IP one
	// rejects them with tracker_outdated and nothing past that point needs to be set up.
	cases := []struct {
		name       string
		realIP     string
		wantStatus int
		wantReason string
	}{
		{"excluded", "203.0.113.7", http.StatusForbidden, webmetrics.RejectExcludedIP},
		{"other", "198.51.100.7", http.StatusUpgradeRequired, webmetrics.RejectTrackerOutdated},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			metrics := &rejectRecorder{}
			e := &handlersImpl{
				log:        logger.New(),
				cfg:        &httpCfg.Config{},
				responser:  api.NewResponser(metrics),
				projects:   fakeProjects{},
				excludeIPs: excludeIPs,
				metrics:    metrics,
			}
			e.cfg.JsonSizeLimit = 1 << 20

			r := httptest.NewRequest(http.MethodPost, "/v1/mobile/start", strings.NewReader(`{"projectKey":"key","trackerVersion":"0.0.1"}`))
			r.Header.Set("X-Real-Ip", tc.realIP)
			w := httptest.NewRecorder()

			e.startMobileSessionHandler(w, r)

			if w.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tc.wantStatus)
			}
			if len(metrics.reasons) != 1 || metrics.reasons[0] != tc.wantReason {
				t.Errorf("reject reasons = %v, want [%s]", metrics.reasons, tc.wantReason)
			}
		})
	}
}
