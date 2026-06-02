package cacher

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
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

type cacher struct {
	log            logger.Logger
	timeoutMap     *timeoutMap                 // Concurrency implemented
	objStorage     objectstorage.ObjectStorage // AWS Docs: "These clients are safe to use concurrently."
	httpClient     *http.Client                // Docs: "Clients are safe for concurrent use by multiple goroutines."
	rewriter       *assets.Rewriter            // Read only
	metrics        metrics.Assets
	sizeLimit      int
	retries        int
	requestHeaders map[string]string
	workers        *WorkerPool
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
			},
		},
		rewriter:       rewriter,
		sizeLimit:      cfg.AssetsSizeLimit,
		retries:        cfg.AssetsRetries,
		requestHeaders: cfg.AssetsRequestHeaders,
		metrics:        metrics,
	}
	c.workers = NewPool(cfg.AssetsWorkerCount, cfg.AssetsQueueSize, c.CacheFile)
	return c, nil
}

func (c *cacher) CacheFile(task *Task) {
	c.cacheURL(task)
}

func (c *cacher) cacheURL(t *Task) {
	ctx := context.WithValue(context.Background(), "sessionID", t.sessionID)
	crTime := c.objStorage.GetCreationTime(t.cachePath)
	if crTime != nil && crTime.After(time.Now().Add(-MAX_STORAGE_TIME)) {
		return
	}
	t.retries--
	start := time.Now()
	req, _ := http.NewRequest("GET", t.requestURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0")
	for k, v := range c.requestHeaders {
		req.Header.Set(k, v)
	}
	res, err := c.httpClient.Do(req)
	if err != nil {
		c.log.Error(ctx, "Error while caching: %s", errors.Wrap(err, t.urlContext))
		return
	}
	c.metrics.RecordDownloadDuration(float64(time.Now().Sub(start).Milliseconds()), res.StatusCode)
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		printErr := true
		// TODO: revisit with the retry mechanics rework — when the queue is full
		// the retry is dropped and we fall through to logging the status code.
		if (res.StatusCode == 403 || res.StatusCode == 503) && t.retries > 0 {
			if c.workers.tryAddTask(t) {
				printErr = false
			}
		}
		if printErr {
			c.log.Error(ctx, "Error while caching: %s", errors.Wrap(fmt.Errorf("Status code is %v, ", res.StatusCode), t.urlContext))
		}
		return
	}
	data, err := io.ReadAll(io.LimitReader(res.Body, int64(c.sizeLimit+1)))
	if err != nil {
		c.log.Error(ctx, "Error while caching: %s", errors.Wrap(err, t.urlContext))
		return
	}
	if len(data) > c.sizeLimit {
		c.log.Error(ctx, "Error while caching: %s", errors.Wrap(errors.New("Maximum size exceeded"), t.urlContext))
		return
	}

	contentType := res.Header.Get("Content-Type")
	if contentType == "" {
		contentType = mime.TypeByExtension(filepath.Ext(res.Request.URL.Path))
	}
	contentEncoding := res.Header.Get("Content-Encoding")

	// Skip html file (usually it's a CDN mock for 404 error)
	if strings.HasPrefix(contentType, "text/html") {
		c.log.Error(ctx, "Error while caching: %s", errors.Wrap(fmt.Errorf("context type is text/html, sessID: %d", t.sessionID), t.urlContext))
		return
	}

	isCSS := strings.HasPrefix(contentType, "text/css")

	strData := string(data)
	if isCSS {
		strData = c.rewriter.RewriteCSS(t.sessionID, t.requestURL, strData) // TODO: one method for rewrite and return list
	}

	// TODO: implement in streams
	start = time.Now()
	err = c.objStorage.Upload(strings.NewReader(strData), t.cachePath, contentType, contentEncoding, objectstorage.NoCompression)
	if err != nil {
		c.metrics.RecordUploadDuration(float64(time.Now().Sub(start).Milliseconds()), true)
		c.log.Error(ctx, "Error while caching: %s", errors.Wrap(err, t.urlContext))
		return
	}
	c.metrics.RecordUploadDuration(float64(time.Now().Sub(start).Milliseconds()), false)
	c.metrics.IncreaseSavedSessions()

	if isCSS {
		if t.depth > 0 {
			for _, extractedURL := range assets.ExtractURLsFromCSS(string(data)) {
				if fullURL, cachable := assets.GetFullCachableURL(t.requestURL, extractedURL); cachable {
					// false: we are inside a worker, enqueue must be non-blocking
					c.checkTask(&Task{
						requestURL: fullURL,
						sessionID:  t.sessionID,
						depth:      t.depth - 1,
						urlContext: t.urlContext + "\n  -> " + fullURL,
						isJS:       false,
						retries:    c.retries,
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
	if c.timeoutMap.contains(cachePath) {
		return
	}
	c.timeoutMap.add(cachePath)
	// add new file in queue to download
	newTask.cachePath = cachePath
	if blocking {
		c.workers.AddTask(newTask)
		return
	}
	// TODO: revisit with the retry mechanics rework — drop-on-full loses the task.
	if !c.workers.tryAddTask(newTask) {
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
		retries:    c.retries,
	}, true)
}

func (c *cacher) CacheURL(sessionID uint64, fullURL string) {
	c.checkTask(&Task{
		requestURL: fullURL,
		sessionID:  sessionID,
		depth:      MAX_CACHE_DEPTH,
		urlContext: fullURL,
		isJS:       false,
		retries:    c.retries,
	}, true)
}

func (c *cacher) UpdateTimeouts() {
	c.timeoutMap.deleteOutdated()
}

func (c *cacher) Stop() {
	c.workers.Stop()
}
