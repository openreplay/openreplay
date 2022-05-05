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
	"os"
	"openreplay/backend/pkg/flakeid"
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
		).Weekday()),
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
func isCachable(rawurl string) bool {
	u, _ := url.Parse(rawurl)
	if u == nil || u.User != nil {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}

	var mimeTypesToIgnore []string

	mimeTypesToIgnoreStr, mimeTypesToIgnoreExists := os.LookupEnv("IGNORE_MIMETYPES_LIST")
	if mimeTypesToIgnoreExists {
		mimeTypesToIgnore = strings.Split(mimeTypesToIgnoreStr, ",")
	}
	
	ext := filepath.Ext(u.Path)

	for k := range supportedMimeTypes {
		if mimeTypesToIgnoreExists {
			for i := range mimeTypesToIgnore {
				if strings.HasSuffix(ext, mimeTypesToIgnore[i]) {
					return false
				}
			}
		}
		if strings.EqualFold(k, ext) {
			return true
		}
	}

	checkResourceMimeType, ok := os.LookupEnv("CHECK_RESOURCE_MIMETYPE")

	if ok && strings.EqualFold(checkResourceMimeType, "true") {
		// Create a temporary httpClient
		client := &http.Client{
			Timeout: time.Duration(6) * time.Second,
				Transport: &http.Transport{
					TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			},
		}

		req, _ := http.NewRequest("GET", rawurl, nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 6.1; rv:31.0) Gecko/20100101 Firefox/31.0")

		// Set Custom Headers
		for _, e := range os.Environ() {
			pair := strings.SplitN(e, "=", 2)
			pair[0] = strings.ToLower(pair[0])
			if (strings.HasPrefix(pair[0], "x-")) {
				req.Header.Set(pair[0], pair[1])
			}
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

func GetFullCachableURL(baseURL string, relativeURL string) (string, bool) {
	if !isRelativeCachable(relativeURL) {
		return relativeURL, false
	}
	fullURL := ResolveURL(baseURL, relativeURL)
	if !isCachable(fullURL) {
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

func (r *Rewriter) RewriteURL(sessionID uint64, baseURL string, relativeURL string) string {
	fullURL, cachable := GetFullCachableURL(baseURL, relativeURL)
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
