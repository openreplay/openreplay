package api

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/tomasen/realip"

	httpCfg "openreplay/backend/internal/config/http"
	"openreplay/backend/pkg/ingest_keys"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
)

const (
	projectIDHeader     = "X-Project-Id"
	tenantIDHeader      = "X-Tenant-Id"
	retentionDaysHeader = "X-Retention-Days"
	collectorLogsPath   = "/v1/logs"
)

type requestStartKey struct{}

type handlersImpl struct {
	log           logger.Logger
	responser     api.Responser
	projects      projects.Projects
	keys          ingest_keys.Keys
	bodyLimit     int64
	retentionDays string
	limiter       *projectLimiter
	failures      *failureLimiter
	proxy         *httputil.ReverseProxy
}

func NewHandlers(cfg *httpCfg.Config, log logger.Logger, responser api.Responser, projs projects.Projects, keys ingest_keys.Keys) (api.Handlers, error) {
	target, err := url.Parse(cfg.OTLPCollectorURL)
	if err != nil {
		return nil, fmt.Errorf("invalid OTLP collector url %q: %w", cfg.OTLPCollectorURL, err)
	}
	if target.Scheme == "" || target.Host == "" {
		return nil, fmt.Errorf("invalid OTLP collector url %q: scheme and host are required", cfg.OTLPCollectorURL)
	}
	if cfg.OTLPRateLimitBytes > 0 && cfg.OTLPRateLimitBurst < cfg.OTLPBodyLimit {
		return nil, fmt.Errorf("OTLP_RATE_LIMIT_BURST (%d) must be at least OTLP_BODY_LIMIT (%d)", cfg.OTLPRateLimitBurst, cfg.OTLPBodyLimit)
	}
	h := &handlersImpl{
		log:           log,
		responser:     responser,
		projects:      projs,
		keys:          keys,
		bodyLimit:     cfg.OTLPBodyLimit,
		retentionDays: strconv.Itoa(cfg.OTLPRetentionDays),
		limiter:       newProjectLimiter(cfg.OTLPRateLimitBytes, cfg.OTLPRateLimitBurst),
		failures:      newFailureLimiter(cfg.OTLPAuthFailPerMin, cfg.OTLPAuthFailBurst, cfg.OTLPAuthFailGlobal),
	}
	if h.failures != nil {
		go h.failures.runCleanup()
	}
	h.proxy = &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(target)
			pr.Out.URL.Path = collectorLogsPath
			pr.Out.URL.RawPath = ""
			pr.Out.Header.Del("Authorization")
		},
		ErrorHandler: h.proxyError,
	}
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{Path: "/v1/otlp/v1/logs", Method: "POST", Handler: h.ingestLogs, Permissions: api.NoPermissions, AuditTrail: api.DoNotTrack},
	}
}

func (h *handlersImpl) ingestLogs(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	key := ingestKey(r.Header.Get("Authorization"))
	if key == "" {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnauthorized, errors.New("missing authorization header"), startTime, r.URL.Path, 0)
		return
	}
	clientIP := realip.FromRequest(r)
	if delay := h.failures.blocked(clientIP, startTime); delay > 0 {
		h.tooManyRequests(w, r, delay, errors.New("too many failed ingest key checks"), startTime)
		return
	}
	projectID, err := h.keys.Resolve(key)
	if errors.Is(err, ingest_keys.ErrNotFound) {
		h.failures.record(clientIP, startTime)
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnauthorized, errors.New("invalid ingest key"), startTime, r.URL.Path, 0)
		return
	}
	if err != nil {
		h.log.Error(r.Context(), "ingest key lookup failed: %s", err)
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusServiceUnavailable, errors.New("ingest key check unavailable"), startTime, r.URL.Path, 0)
		return
	}
	project, err := h.projects.GetProject(projectID)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnauthorized, errors.New("project is not active"), startTime, r.URL.Path, 0)
		return
	}
	if r.ContentLength > h.bodyLimit {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusRequestEntityTooLarge, fmt.Errorf("body exceeds %d bytes", h.bodyLimit), startTime, r.URL.Path, int(r.ContentLength))
		return
	}
	charged := r.ContentLength
	if charged < 0 {
		charged = h.bodyLimit
	}
	if delay := h.limiter.wait(project.ProjectID, charged, startTime); delay > 0 {
		h.tooManyRequests(w, r, delay, errors.New("ingest rate limit exceeded"), startTime)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, h.bodyLimit)
	r.Header.Set(projectIDHeader, strconv.FormatUint(uint64(project.ProjectID), 10))
	r.Header.Del(tenantIDHeader)
	if project.TenantID > 0 {
		r.Header.Set(tenantIDHeader, strconv.Itoa(project.TenantID))
	}
	r.Header.Set(retentionDaysHeader, h.retentionDays)
	h.proxy.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestStartKey{}, startTime)))
}

func (h *handlersImpl) tooManyRequests(w http.ResponseWriter, r *http.Request, delay time.Duration, err error, startTime time.Time) {
	w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(delay.Seconds()))))
	h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusTooManyRequests, err, startTime, r.URL.Path, 0)
}

func (h *handlersImpl) proxyError(w http.ResponseWriter, r *http.Request, err error) {
	startTime, _ := r.Context().Value(requestStartKey{}).(time.Time)
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusRequestEntityTooLarge, fmt.Errorf("body exceeds %d bytes", h.bodyLimit), startTime, r.URL.Path, 0)
		return
	}
	h.log.Error(r.Context(), "otlp collector request failed: %s", err)
	h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusServiceUnavailable, errors.New("collector unavailable"), startTime, r.URL.Path, 0)
}

func ingestKey(authHeader string) string {
	value := strings.TrimSpace(authHeader)
	if token, ok := strings.CutPrefix(value, "Bearer "); ok {
		return strings.TrimSpace(token)
	}
	return value
}
