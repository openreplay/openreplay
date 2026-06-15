package cacher

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io"
	"math/rand"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	config "openreplay/backend/internal/config/assets"
	"openreplay/backend/pkg/logger"
	metrics "openreplay/backend/pkg/metrics/assets"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/url/assets"

	"github.com/pkg/errors"
)

const MAX_CACHE_DEPTH = 5

const hostDeferDelay = 250 * time.Millisecond

type cacher struct {
	log            logger.Logger
	timeoutMap     *timeoutMap                 // Concurrency implemented
	objStorage     objectstorage.ObjectStorage // AWS Docs: "These clients are safe to use concurrently."
	httpClient     *http.Client                // Docs: "Clients are safe for concurrent use by multiple goroutines."
	rewriter       *assets.Rewriter            // Read only
	metrics        metrics.Assets
	sizeLimit      int
	maxAttempts    int
	retryBase      time.Duration
	retryCap       time.Duration
	retryAfterCap  time.Duration
	failureTTL     time.Duration
	requestHeaders map[string]string
	workers        *WorkerPool
	scheduler      *scheduler
	hosts          *hostLimiter
}

func (c *cacher) CanCache() bool {
	return c.workers.CanAddTask()
}

func NewCacher(log logger.Logger, cfg *config.Config, store objectstorage.ObjectStorage, metrics metrics.Assets) (*cacher, error) {
	switch {
	case cfg == nil:
		return nil, errors.New("config is nil")
	case store == nil:
		return nil, errors.New("object storage is nil")
	}

	rewriter, err := assets.NewRewriter(cfg.AssetsOrigin)
	if err != nil {
		return nil, errors.Wrap(err, "can't create rewriter")
	}

	tlsConfig := &tls.Config{
		InsecureSkipVerify: cfg.InsecureSkipVerify,
	}

	if cfg.ClientCertFilePath != "" && cfg.ClientKeyFilePath != "" && cfg.CaCertFilePath != "" {

		var cert tls.Certificate
		var err error

		cert, err = tls.LoadX509KeyPair(cfg.ClientCertFilePath, cfg.ClientKeyFilePath)
		if err != nil {
			return nil, fmt.Errorf("error creating x509 keypair from the client cert file %s and client key file %s , Error: %s",
				err, cfg.ClientCertFilePath, cfg.ClientKeyFilePath)
		}

		caCert, err := os.ReadFile(cfg.CaCertFilePath)
		if err != nil {
			return nil, fmt.Errorf("error opening cert file %s, Error: %s", cfg.CaCertFilePath, err)
		}
		caCertPool := x509.NewCertPool()
		caCertPool.AppendCertsFromPEM(caCert)
		tlsConfig = &tls.Config{
			InsecureSkipVerify: cfg.InsecureSkipVerify,
			Certificates:       []tls.Certificate{cert},
			RootCAs:            caCertPool,
		}

	}

	c := &cacher{
		log:        log,
		timeoutMap: newTimeoutMap(),
		objStorage: store,
		httpClient: &http.Client{
			Timeout: time.Duration(cfg.AssetsHTTPTimeout) * time.Second,
			Transport: &http.Transport{
				Proxy:           http.ProxyFromEnvironment,
				TLSClientConfig: tlsConfig,
				DialContext: (&net.Dialer{
					Timeout:   5 * time.Second,
					KeepAlive: 30 * time.Second,
				}).DialContext,
				TLSHandshakeTimeout: 5 * time.Second,
				MaxConnsPerHost:     8,
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 4,
				IdleConnTimeout:     30 * time.Second,
			},
		},
		rewriter:       rewriter,
		sizeLimit:      cfg.AssetsSizeLimit,
		maxAttempts:    cfg.AssetsRetries,
		retryBase:      time.Duration(cfg.AssetsRetryBaseMs) * time.Millisecond,
		retryCap:       time.Duration(cfg.AssetsRetryMaxMs) * time.Millisecond,
		retryAfterCap:  time.Duration(cfg.AssetsRetryAfterCap) * time.Millisecond,
		failureTTL:     time.Duration(cfg.AssetsFailureSuppMin) * time.Minute,
		requestHeaders: cfg.AssetsRequestHeaders,
		metrics:        metrics,
		hosts:          newHostLimiter(cfg.AssetsPerHostLimit),
	}
	c.workers = NewPool(cfg.AssetsWorkerCount, cfg.AssetsQueueSize, c.CacheFile)
	c.scheduler = newScheduler(cfg.AssetsRetryHeapLimit, c.workers.tryAddTask, func(n int) {
		c.metrics.RecordRetryQueueSize(float64(n))
	})
	return c, nil
}

func (c *cacher) CacheFile(task *Task) {
	c.cacheURL(task)
}

func (c *cacher) cacheURL(t *Task) {
	ctx := context.WithValue(context.Background(), "sessionID", t.sessionID)

	// Per-host throttle: this is NOT a retry — the attempt counter is untouched.
	if !c.hosts.tryAcquire(t.host) {
		c.scheduleThrottle(ctx, t)
		return
	}
	defer c.hosts.release(t.host)

	crTime := c.objStorage.GetCreationTime(t.cachePath)
	if crTime != nil && crTime.After(time.Now().Add(-MAX_STORAGE_TIME)) {
		return
	}
	start := time.Now()
	req, _ := http.NewRequest("GET", t.requestURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36")
	for k, v := range c.requestHeaders {
		req.Header.Set(k, v)
	}
	res, err := c.httpClient.Do(req)
	if err != nil {
		c.retry(ctx, t, 0, "network", err)
		return
	}
	c.metrics.RecordDownloadDuration(float64(time.Now().Sub(start).Milliseconds()), res.StatusCode)
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		cause := fmt.Errorf("status code is %d", res.StatusCode)
		reason := "status_" + strconv.Itoa(res.StatusCode)
		if isRetryableStatus(res.StatusCode) {
			c.retry(ctx, t, c.retryAfterDelay(res), reason, cause)
		} else {
			c.permanent(ctx, t, reason, cause)
		}
		return
	}
	data, err := io.ReadAll(io.LimitReader(res.Body, int64(c.sizeLimit+1)))
	if err != nil {
		c.retry(ctx, t, 0, "read_body", err)
		return
	}
	if len(data) > c.sizeLimit {
		c.permanent(ctx, t, "size_exceeded", errors.New("maximum size exceeded"))
		return
	}

	contentType := res.Header.Get("Content-Type")
	if contentType == "" {
		contentType = mime.TypeByExtension(filepath.Ext(res.Request.URL.Path))
	}
	contentEncoding := res.Header.Get("Content-Encoding")

	// Skip html file (usually it's a CDN mock for 404 error)
	if strings.HasPrefix(contentType, "text/html") {
		c.permanent(ctx, t, "text_html", fmt.Errorf("content type is text/html"))
		return
	}

	isCSS := strings.HasPrefix(contentType, "text/css")

	strData := string(data)
	var cssURLs []string
	if isCSS {
		strData, cssURLs = c.rewriter.RewriteCSSAndExtract(t.sessionID, t.requestURL, strData)
	}

	// TODO: implement in streams
	start = time.Now()
	err = c.objStorage.Upload(strings.NewReader(strData), t.cachePath, contentType, contentEncoding, objectstorage.NoCompression)
	if err != nil {
		c.metrics.RecordUploadDuration(float64(time.Now().Sub(start).Milliseconds()), true)
		c.retry(ctx, t, 0, "upload", err)
		return
	}
	c.metrics.RecordUploadDuration(float64(time.Now().Sub(start).Milliseconds()), false)
	c.metrics.IncreaseSavedSessions()

	if isCSS {
		if t.depth > 0 {
			for _, extractedURL := range cssURLs {
				if fullURL, cachable := assets.GetFullCachableURL(t.requestURL, extractedURL); cachable {
					// false: we are inside a worker, enqueue must be non-blocking
					c.checkTask(&Task{
						requestURL: fullURL,
						sessionID:  t.sessionID,
						depth:      t.depth - 1,
						urlContext: t.urlContext + "\n  -> " + fullURL,
						isJS:       false,
					}, false)
				}
			}
		} else {
			c.log.Error(ctx, "Error while caching: %s", errors.Wrap(errors.New("Maximum recursion cache depth exceeded"), t.urlContext))
			return
		}
	}
	return
}

func (c *cacher) retry(ctx context.Context, t *Task, explicitDelay time.Duration, reason string, cause error) {
	t.attempt++
	if t.attempt >= c.maxAttempts {
		// final try: drop, record, and evict the dedup entry so a future asset can re-trigger the download.
		c.timeoutMap.addFor(t.cachePath, c.failureTTL)
		c.metrics.IncreaseTerminalFailures(reason)
		c.log.Error(ctx, "Error while caching (terminal, attempts=%d, reason=%s): %s", t.attempt, reason, errors.Wrap(cause, t.urlContext))
		return
	}
	delay := explicitDelay
	if delay <= 0 {
		delay = c.backoff(t.attempt)
	}
	if c.scheduler.schedule(t, time.Now().Add(delay)) {
		c.metrics.IncreaseRetries()
	} else {
		// retry heap is full: shed load (the entry stays deduped for now)
		c.metrics.IncreaseTerminalFailures("retry_queue_full")
		c.log.Warn(ctx, "retry queue full, dropping asset: %s", errors.Wrap(cause, t.urlContext))
	}
}

func (c *cacher) permanent(ctx context.Context, t *Task, reason string, cause error) {
	c.metrics.IncreaseTerminalFailures(reason)
	c.log.Error(ctx, "Error while caching (permanent, reason=%s): %s", reason, errors.Wrap(cause, t.urlContext))
}

func (c *cacher) scheduleThrottle(ctx context.Context, t *Task) {
	delay := hostDeferDelay + time.Duration(rand.Int63n(int64(hostDeferDelay)))
	if !c.scheduler.schedule(t, time.Now().Add(delay)) {
		c.metrics.IncreaseTerminalFailures("throttle_queue_full")
		c.log.Warn(ctx, "retry queue full, dropping throttled asset: %s", t.urlContext)
	}
}

func (c *cacher) backoff(attempt int) time.Duration {
	d := c.retryCap
	if shift := attempt - 1; shift >= 0 && shift < 31 {
		if scaled := c.retryBase << uint(shift); scaled > 0 && scaled < c.retryCap {
			d = scaled
		}
	}
	if d <= 0 {
		return 0
	}
	return time.Duration(rand.Int63n(int64(d)))
}

func (c *cacher) retryAfterDelay(res *http.Response) time.Duration {
	if res.StatusCode != http.StatusTooManyRequests && res.StatusCode != http.StatusServiceUnavailable {
		return 0
	}
	d, ok := parseRetryAfter(res.Header.Get("Retry-After"))
	if !ok {
		return 0
	}
	if d > c.retryAfterCap {
		d = c.retryAfterCap
	}
	return d
}

func isRetryableStatus(code int) bool {
	switch code {
	case http.StatusForbidden, http.StatusRequestTimeout, http.StatusTooManyRequests:
		return true
	}
	return code >= 500
}

func parseRetryAfter(h string) (time.Duration, bool) {
	h = strings.TrimSpace(h)
	if h == "" {
		return 0, false
	}
	if secs, err := strconv.Atoi(h); err == nil {
		if secs < 0 {
			return 0, false
		}
		return time.Duration(secs) * time.Second, true
	}
	if t, err := http.ParseTime(h); err == nil {
		if d := time.Until(t); d > 0 {
			return d, true
		}
		return 0, true
	}
	return 0, false
}

func hostOf(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	return u.Hostname()
}

// checkTask deduplicates and enqueues a task. blocking selects the enqueue
// strategy: external callers (consumer goroutine) pass true to apply backpressure,
// worker-originated callers (CSS recursion) pass false to avoid deadlocking the pool.
func (c *cacher) checkTask(newTask *Task, blocking bool) {
	// check if file was recently uploaded
	var cachePath string
	if newTask.isJS {
		cachePath = assets.GetCachePathForJS(newTask.requestURL)
	} else {
		cachePath = assets.GetCachePathForAssets(newTask.sessionID, newTask.requestURL)
	}
	if !c.timeoutMap.claim(cachePath) {
		return
	}
	newTask.cachePath = cachePath
	newTask.host = hostOf(newTask.requestURL)
	if blocking {
		c.workers.AddTask(newTask)
		return
	}
	if !c.workers.tryAddTask(newTask) {
		c.timeoutMap.delete(cachePath)
		ctx := context.WithValue(context.Background(), "sessionID", newTask.sessionID)
		c.log.Warn(ctx, "cacher queue full, dropping asset task: %s", newTask.requestURL)
	}
}

func (c *cacher) CacheJSFile(sourceURL string) {
	c.checkTask(&Task{
		requestURL: sourceURL,
		sessionID:  0,
		depth:      0,
		urlContext: sourceURL,
		isJS:       true,
	}, true)
}

func (c *cacher) CacheURL(sessionID uint64, fullURL string) {
	c.checkTask(&Task{
		requestURL: fullURL,
		sessionID:  sessionID,
		depth:      MAX_CACHE_DEPTH,
		urlContext: fullURL,
		isJS:       false,
	}, true)
}

func (c *cacher) UpdateTimeouts() {
	c.timeoutMap.deleteOutdated()
}

func (c *cacher) Stop() {
	c.scheduler.stop()
	c.workers.Stop()
}
