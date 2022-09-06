package assets

import (
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"fmt"
	"net/http"
	"crypto/tls"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/internal/config/assets"
)

var supportedMimeTypes = map[string][]string{
	".css" : []string{"text/css"},
	".woff" : []string{"font/woff", "application/font-woff"},
	".woff2" : []string{"font/woff2", "application/font-woff2"},
	".ttf" : []string{"font/ttf"},
	".otf" : []string{"font/otf"},
	".svg"  : []string{"image/svg+xml"},
	".eot"  : []string{"application/vnd.ms-fontobject"},
}
  

func getSessionKey(sessionID uint64) string {
	return strconv.FormatUint(
		uint64(time.UnixMilli(
			int64(flakeid.ExtractTimestamp(sessionID)),
		).Day()),
		10,
	)
}

func ResolveURL(baseurl string, rawurl string) string {
	rawurl = strings.Trim(rawurl, " ")
	if !isRelativeCachable(rawurl) {
		return rawurl
	}
	base, _ := url.ParseRequestURI(baseurl) // fn Only for base urls
	u, _ := url.Parse(rawurl)               // TODO: handle errors ?
	if base == nil || u == nil {
		return rawurl
	}
	return base.ResolveReference(u).String() // ResolveReference same as base.Parse(rawurl)
}

func isRelativeCachable(relativeURL string) bool {
	if len(relativeURL) == 0 || relativeURL[0] == '#' {
		return false
	}
	return true
}

func isCachable(rawurl string, cfg *assets.Config) bool {
	u, _ := url.Parse(rawurl)
	if u == nil || u.User != nil {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}

	ext := filepath.Ext(u.Path)

	for k := range supportedMimeTypes {
		if cfg.IgnoreMimetypesList != nil && len(cfg.IgnoreMimetypesList) > 0 {
			for i := range cfg.IgnoreMimetypesList {
				if strings.HasSuffix(ext, cfg.IgnoreMimetypesList[i]) {
					return false
				}
			}
		}
		if strings.EqualFold(k, ext) {
			return true
		}
	}

	if cfg.CheckResourceMimetype {
		// Create a temporary httpClient
		client := &http.Client{
			Timeout: time.Duration(6) * time.Second,
				Transport: &http.Transport{
					TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			},
		}

		req, _ := http.NewRequest("GET", rawurl, nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 6.1; rv:31.0) Gecko/20100101 Firefox/31.0")

		
		for k, v := range cfg.AssetsRequestHeaders {
			req.Header.Set(k, v)
		}

		res, err := client.Do(req)
		if err != nil {
			return false
		}
		defer res.Body.Close()
		if res.StatusCode >= 400 {
			fmt.Println("Status code is ", res.StatusCode)
			return false
		}

		contentType := res.Header.Get("Content-Type")
		if contentType == "" {
			return false
		}

		for _, mimeTypes := range supportedMimeTypes {
			for mimeTypeIndex := range mimeTypes {
				if strings.EqualFold(contentType, mimeTypes[mimeTypeIndex]) {
					return true
				}
			}
		}
	}
	
	return false
}

func GetFullCachableURL(baseURL string, relativeURL string, cfg *assets.Config) (string, bool) {
	if !isRelativeCachable(relativeURL) {
		return relativeURL, false
	}
	fullURL := ResolveURL(baseURL, relativeURL)
	if !isCachable(fullURL, cfg) {
		return fullURL, false
	}
	return fullURL, true
}

func getCachePath(rawurl string) string {
	return "/" + strings.ReplaceAll(url.QueryEscape(rawurl), "%", "!") // s3 keys are ok with "!"
}

func getCachePathWithKey(sessionID uint64, rawurl string) string {
	return getCachePath(rawurl) + "." + getSessionKey(sessionID) // Be carefull with slashes
}

func GetCachePathForJS(rawurl string) string {
	return getCachePath(rawurl)
}

func GetCachePathForAssets(sessionID uint64, rawurl string) string {
	return getCachePathWithKey(sessionID, rawurl)
}

func (r *Rewriter) RewriteURL(sessionID uint64, baseURL string, relativeURL string, cfg *assets.Config) string {
	fullURL, cachable := GetFullCachableURL(baseURL, relativeURL, cfg)
	if !cachable {
		return fullURL
	}

	u := url.URL{
		Path:   r.assetsURL.Path + getCachePathWithKey(sessionID, fullURL),
		Host:   r.assetsURL.Host,
		Scheme: r.assetsURL.Scheme,
	}
	return u.String()
}
