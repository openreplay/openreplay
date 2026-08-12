package assets

import (
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/cespare/xxhash/v2"

	"openreplay/backend/pkg/flakeid"
)

const (
	// KeySchemeDaily — legacy: key = <escaped-url>.<day-of-month>
	KeySchemeDaily = "daily"
	// KeySchemeHash — key = <escaped-url>.<xxhash64(origin body)>
	KeySchemeHash = "hash"
)

func ValidKeyScheme(scheme string) bool {
	return scheme == KeySchemeDaily || scheme == KeySchemeHash
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
	baseurl = strings.Split(baseurl, "#")[0] // remove #fragment suffix if present
	base, _ := url.ParseRequestURI(baseurl)  // fn Only for base urls
	u, _ := url.Parse(rawurl)                // TODO: handle errors ?
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
		ext == ".ashx" || // ASP .NET
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

func HashBody(body []byte) string {
	return strconv.FormatUint(xxhash.Sum64(body), 16)
}

func GetCachePathWithHash(rawurl string, hash string) string {
	return getCachePath(rawurl) + "." + hash
}

func (r *Rewriter) CachePathForAssets(sessionID uint64, rawurl string) string {
	if r.scheme == KeySchemeHash {
		return getCachePath(rawurl)
	}
	return getCachePathWithKey(sessionID, rawurl)
}

func (r *Rewriter) rewritePath(sessionID uint64, fullURL string) string {
	if r.scheme == KeySchemeHash {
		if r.resolver != nil {
			if hash, ok := r.resolver.Lookup(fullURL); ok {
				return GetCachePathWithHash(fullURL, hash)
			}
		}
		return getCachePath(fullURL) // mapping cold: fall back to the current-version pointer
	}
	return getCachePathWithKey(sessionID, fullURL)
}

func (r *Rewriter) RewriteURL(sessionID uint64, baseURL string, relativeURL string) string {
	fullURL, cachable := GetFullCachableURL(baseURL, relativeURL)
	if !cachable {
		return fullURL
	}

	u := url.URL{
		Path:   r.assetsURL.Path + r.rewritePath(sessionID, fullURL),
		Host:   r.assetsURL.Host,
		Scheme: r.assetsURL.Scheme,
	}
	return u.String()
}
