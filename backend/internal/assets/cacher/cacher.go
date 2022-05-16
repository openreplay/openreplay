package cacher

import (
	"crypto/tls"
	"fmt"
	"io"
	"io/ioutil"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/pkg/errors"

	"openreplay/backend/pkg/storage"
	"openreplay/backend/pkg/url/assets"
)

const MAX_CACHE_DEPTH = 5

type cacher struct {
	timeoutMap *timeoutMap      // Concurrency implemented
	s3         *storage.S3      // AWS Docs: "These clients are safe to use concurrently."
	httpClient *http.Client     // Docs: "Clients are safe for concurrent use by multiple goroutines."
	rewriter   *assets.Rewriter // Read only
	Errors     chan error
	sizeLimit  int
}

func NewCacher(region string, bucket string, origin string, sizeLimit int) *cacher {
	rewriter := assets.NewRewriter(origin)
	return &cacher{
		timeoutMap: newTimeoutMap(),
		s3:         storage.NewS3(region, bucket),
		httpClient: &http.Client{
			Timeout: time.Duration(6) * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			},
		},
		rewriter:  rewriter,
		Errors:    make(chan error),
		sizeLimit: sizeLimit,
	}
}

func (c *cacher) cacheURL(requestURL string, sessionID uint64, depth byte, context string, isJS bool) {
	var cachePath string
	if isJS {
		cachePath = assets.GetCachePathForJS(requestURL)
	} else {
		cachePath = assets.GetCachePathForAssets(sessionID, requestURL)
	}
	if c.timeoutMap.contains(cachePath) {
		return
	}
	c.timeoutMap.add(cachePath)
	if c.s3.Exists(cachePath) {
		return
	}

	req, _ := http.NewRequest("GET", requestURL, nil)
	req.Header.Set("Cookie", "ABv=3;") // Hack for rueducommerce
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 6.1; rv:31.0) Gecko/20100101 Firefox/31.0")
	res, err := c.httpClient.Do(req)
	if err != nil {
		c.Errors <- errors.Wrap(err, context)
		return
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		// TODO: retry
		c.Errors <- errors.Wrap(fmt.Errorf("Status code is %v, ", res.StatusCode), context)
		return
	}
	data, err := ioutil.ReadAll(io.LimitReader(res.Body, int64(c.sizeLimit+1)))
	if err != nil {
		c.Errors <- errors.Wrap(err, context)
		return
	}
	if len(data) > c.sizeLimit {
		c.Errors <- errors.Wrap(errors.New("Maximum size exceeded"), context)
		return
	}

	contentType := res.Header.Get("Content-Type")
	if contentType == "" {
		contentType = mime.TypeByExtension(filepath.Ext(res.Request.URL.Path))
	}
	isCSS := strings.HasPrefix(contentType, "text/css")

	strData := string(data)
	if isCSS {
		strData = c.rewriter.RewriteCSS(sessionID, requestURL, strData) // TODO: one method for reqrite and return list
	}

	// TODO: implement in streams
	err = c.s3.Upload(strings.NewReader(strData), cachePath, contentType, false)
	if err != nil {
		c.Errors <- errors.Wrap(err, context)
		return
	}

	if isCSS {
		if depth > 0 {
			for _, extractedURL := range assets.ExtractURLsFromCSS(string(data)) {
				if fullURL, cachable := assets.GetFullCachableURL(requestURL, extractedURL); cachable {
					go c.cacheURL(fullURL, sessionID, depth-1, context+"\n  -> "+fullURL, false)
				}
			}
			if err != nil {
				c.Errors <- errors.Wrap(err, context)
				return
			}
		} else {
			c.Errors <- errors.Wrap(errors.New("Maximum recursion cache depth exceeded"), context)
			return
		}
	}
	return
}

func (c *cacher) CacheJSFile(sourceURL string) {
	go c.cacheURL(sourceURL, 0, 0, sourceURL, true)
}

func (c *cacher) CacheURL(sessionID uint64, fullURL string) {
	go c.cacheURL(fullURL, sessionID, MAX_CACHE_DEPTH, fullURL, false)
}

// func (c *cacher) CacheURL(sessionID uint64, baseURL string, relativeURL string) {
// 	if fullURL, cachable := assets.GetFullCachableURL(baseURL, relativeURL); cachable {
// 		c.CacheURL(sessionID, fullURL)
// 	}
// }

// func (c *cacher) CacheCSSLinks(baseURL string, css string, sessionID uint64) {
// 	for _, extractedURL := range assets.ExtractURLsFromCSS(css) {
// 		c.CacheURL(sessionID, baseURL, extractedURL)
// 	}
// }

func (c *cacher) UpdateTimeouts() {
	c.timeoutMap.deleteOutdated()
}
