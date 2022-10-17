package cacher

import (
	"context"
	"crypto/tls"
	"fmt"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"io"
	"io/ioutil"
	"log"
	"mime"
	"net/http"
	"openreplay/backend/pkg/monitoring"
	"path/filepath"
	"strings"
	"time"

	"github.com/pkg/errors"

	config "openreplay/backend/internal/config/assets"
	"openreplay/backend/pkg/storage"
	"openreplay/backend/pkg/url/assets"
)

const MAX_CACHE_DEPTH = 5

type cacher struct {
	timeoutMap       *timeoutMap      // Concurrency implemented
	s3               *storage.S3      // AWS Docs: "These clients are safe to use concurrently."
	httpClient       *http.Client     // Docs: "Clients are safe for concurrent use by multiple goroutines."
	rewriter         *assets.Rewriter // Read only
	Errors           chan error
	sizeLimit        int
	downloadedAssets syncfloat64.Counter
	requestHeaders   map[string]string
	workers          *WorkerPool
}

func (c *cacher) CanCache() bool {
	return c.workers.CanAddTask()
}

func NewCacher(cfg *config.Config, metrics *monitoring.Metrics) *cacher {
	rewriter := assets.NewRewriter(cfg.AssetsOrigin)
	if metrics == nil {
		log.Fatalf("metrics are empty")
	}
	downloadedAssets, err := metrics.RegisterCounter("assets_downloaded")
	if err != nil {
		log.Printf("can't create downloaded_assets metric: %s", err)
	}
	c := &cacher{
		timeoutMap: newTimeoutMap(),
		s3:         storage.NewS3(cfg.AWSRegion, cfg.S3BucketAssets),
		httpClient: &http.Client{
			Timeout: time.Duration(6) * time.Second,
			Transport: &http.Transport{
				Proxy:           http.ProxyFromEnvironment,
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			},
		},
		rewriter:         rewriter,
		Errors:           make(chan error),
		sizeLimit:        cfg.AssetsSizeLimit,
		downloadedAssets: downloadedAssets,
		requestHeaders:   cfg.AssetsRequestHeaders,
	}
	c.workers = NewPool(32, c.CacheFile)
	return c
}

func (c *cacher) CacheFile(task *Task) {
	c.cacheURL(task)
}

func (c *cacher) cacheURL(t *Task) {
	t.retries--
	//requestURL sessionID uint64, depth byte, urlContext, cachePath string) {
	req, _ := http.NewRequest("GET", t.requestURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 6.1; rv:31.0) Gecko/20100101 Firefox/31.0")
	for k, v := range c.requestHeaders {
		req.Header.Set(k, v)
	}
	res, err := c.httpClient.Do(req)
	if err != nil {
		c.Errors <- errors.Wrap(err, t.urlContext)
		return
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		printErr := true
		// Retry 403 error
		if res.StatusCode == 403 && t.retries > 0 {
			c.workers.AddTask(t)
			printErr = false
		}
		if printErr {
			c.Errors <- errors.Wrap(fmt.Errorf("Status code is %v, ", res.StatusCode), t.urlContext)
		}
		return
	}
	data, err := ioutil.ReadAll(io.LimitReader(res.Body, int64(c.sizeLimit+1)))
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
	isCSS := strings.HasPrefix(contentType, "text/css")

	strData := string(data)
	if isCSS {
		strData = c.rewriter.RewriteCSS(t.sessionID, t.requestURL, strData) // TODO: one method for rewrite and return list
	}

	// TODO: implement in streams
	err = c.s3.Upload(strings.NewReader(strData), t.cachePath, contentType, false)
	if err != nil {
		c.Errors <- errors.Wrap(err, t.urlContext)
		return
	}
	c.downloadedAssets.Add(context.Background(), 1)

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
						retries:    5,
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
	crTime := c.s3.GetCreationTime(cachePath)
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
		retries:    5,
	})
}

func (c *cacher) CacheURL(sessionID uint64, fullURL string) {
	c.checkTask(&Task{
		requestURL: fullURL,
		sessionID:  sessionID,
		depth:      MAX_CACHE_DEPTH,
		urlContext: fullURL,
		isJS:       false,
		retries:    5,
	})
}

func (c *cacher) UpdateTimeouts() {
	c.timeoutMap.deleteOutdated()
}

func (c *cacher) Stop() {
	c.workers.Stop()
}
