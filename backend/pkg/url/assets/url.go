package assets

import (
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"openreplay/backend/pkg/flakeid"
)

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
func isCachable(rawurl string) bool {
	u, _ := url.Parse(rawurl)
	if u == nil || u.User != nil {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}
	ext := filepath.Ext(u.Path)
	return ext == ".css" ||
		ext == ".woff" ||
		ext == ".woff2" ||
		ext == ".ttf" ||
		ext == ".otf" ||
		ext == ".eot"
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
