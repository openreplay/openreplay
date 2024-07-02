package cacher

import (
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
	metrics "openreplay/backend/pkg/metrics/assets"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/url/assets"

	"github.com/pkg/errors"
)

const MAX_CACHE_DEPTH = 5

type cacher struct {
	timeoutMap     *timeoutMap                 // Concurrency implemented
	objStorage     objectstorage.ObjectStorage // AWS Docs: "These clients are safe to use concurrently."
	httpClient     *http.Client                // Docs: "Clients are safe for concurrent use by multiple goroutines."
	rewriter       *assets.Rewriter            // Read only
	Errors         chan error
	sizeLimit      int
	requestHeaders map[string]string
	workers        *WorkerPool
}

func (c *cacher) CanCache() bool {
	return c.workers.CanAddTask()
}

func NewCacher(cfg *config.Config, store objectstorage.ObjectStorage) (*cacher, error) {
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
		InsecureSkipVerify: true,
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
			InsecureSkipVerify: true,
			Certificates:       []tls.Certificate{cert},
			RootCAs:            caCertPool,
		}

	}

	c := &cacher{
		timeoutMap: newTimeoutMap(),
		objStorage: store,
		httpClient: &http.Client{
			Timeout: time.Duration(6) * time.Second,
			Transport: &http.Transport{
				Proxy:           http.ProxyFromEnvironment,
				TLSClientConfig: tlsConfig,
			},
		},
		rewriter:       rewriter,
		Errors:         make(chan error),
		sizeLimit:      cfg.AssetsSizeLimit,
		requestHeaders: cfg.AssetsRequestHeaders,
	}
	c.workers = NewPool(64, c.CacheFile)
	return c, nil
}

func (c *cacher) CacheFile(task *Task) {
	c.cacheURL(task)
}

func (c *cacher) cacheURL(t *Task) {
	t.retries--
	start := time.Now()
	req, _ := http.NewRequest("GET", t.requestURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0")
	for k, v := range c.requestHeaders {
		req.Header.Set(k, v)
	}
	res, err := c.httpClient.Do(req)
	if err != nil {
		c.Errors <- errors.Wrap(err, t.urlContext)
		return
	}
	metrics.RecordDownloadDuration(float64(time.Now().Sub(start).Milliseconds()), res.StatusCode)
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		printErr := true
		// Retry 403/503 errors
		if (res.StatusCode == 403 || res.StatusCode == 503) && t.retries > 0 {
			c.workers.AddTask(t)
			printErr = false
		}
		if printErr {
			c.Errors <- errors.Wrap(fmt.Errorf("Status code is %v, ", res.StatusCode), t.urlContext)
		}
		return
	}
	data, err := io.ReadAll(io.LimitReader(res.Body, int64(c.sizeLimit+1)))
	if err != nil {
		c.Errors <- errors.Wrap(err, t.urlContext)
		return
	}
	if len(data) > c.sizeLimit {
		c.Errors <- errors.Wrap(errors.New("Maximum size exceeded"), t.urlContext)
		return
	}

	contentType := res.Header.Get("Content-Type")
	if contentType == "" {
		contentType = mime.TypeByExtension(filepath.Ext(res.Request.URL.Path))
	}

	// Skip html file (usually it's a CDN mock for 404 error)
	if strings.HasPrefix(contentType, "text/html") {
		c.Errors <- errors.Wrap(fmt.Errorf("context type is text/html, sessID: %d", t.sessionID), t.urlContext)
		return
	}

	isCSS := strings.HasPrefix(contentType, "text/css")

	strData := string(data)
	if isCSS {
		strData = c.rewriter.RewriteCSS(t.sessionID, t.requestURL, strData) // TODO: one method for rewrite and return list
	}

	// TODO: implement in streams
	start = time.Now()
	err = c.objStorage.Upload(strings.NewReader(strData), t.cachePath, contentType, objectstorage.NoCompression)
	if err != nil {
		metrics.RecordUploadDuration(float64(time.Now().Sub(start).Milliseconds()), true)
		c.Errors <- errors.Wrap(err, t.urlContext)
		return
	}
	metrics.RecordUploadDuration(float64(time.Now().Sub(start).Milliseconds()), false)
	metrics.IncreaseSavedSessions()

	if isCSS {
		if t.depth > 0 {
			for _, extractedURL := range assets.ExtractURLsFromCSS(string(data)) {
				if fullURL, cachable := assets.GetFullCachableURL(t.requestURL, extractedURL); cachable {
					c.checkTask(&Task{
						requestURL: fullURL,
						sessionID:  t.sessionID,
						depth:      t.depth - 1,
						urlContext: t.urlContext + "\n  -> " + fullURL,
						isJS:       false,
						retries:    setRetries(),
					})
				}
			}
			if err != nil {
				c.Errors <- errors.Wrap(err, t.urlContext)
				return
			}
		} else {
			c.Errors <- errors.Wrap(errors.New("Maximum recursion cache depth exceeded"), t.urlContext)
			return
		}
	}
	return
}

func (c *cacher) checkTask(newTask *Task) {
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
	crTime := c.objStorage.GetCreationTime(cachePath)
	if crTime != nil && crTime.After(time.Now().Add(-MAX_STORAGE_TIME)) {
		return
	}
	// add new file in queue to download
	newTask.cachePath = cachePath
	c.workers.AddTask(newTask)
}

func (c *cacher) CacheJSFile(sourceURL string) {
	c.checkTask(&Task{
		requestURL: sourceURL,
		sessionID:  0,
		depth:      0,
		urlContext: sourceURL,
		isJS:       true,
		retries:    setRetries(),
	})
}

func (c *cacher) CacheURL(sessionID uint64, fullURL string) {
	c.checkTask(&Task{
		requestURL: fullURL,
		sessionID:  sessionID,
		depth:      MAX_CACHE_DEPTH,
		urlContext: fullURL,
		isJS:       false,
		retries:    setRetries(),
	})
}

func (c *cacher) UpdateTimeouts() {
	c.timeoutMap.deleteOutdated()
}

func (c *cacher) Stop() {
	c.workers.Stop()
}

func setRetries() int {
	return 10
}
