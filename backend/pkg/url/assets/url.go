package assets

import (
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
)

func getSessionKey(sessionID uint64) string {
	// Based on timestamp, changes once per week. Check out utils/flacker for understanding sessionID
	return strconv.FormatUint(sessionID>>50, 10) 
}

func ResolveURL(baseurl string, rawurl string) string {
	if !isRelativeCachable(rawurl) {
		return rawurl
	}
	base, _ := url.ParseRequestURI(baseurl) // fn Only for base urls
	u, _ := url.Parse(rawurl) // TODO: handle errors ?
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
		ext == ".otf"
}

func GetFullCachableURL(baseURL string, relativeURL string) (string, bool) {
	if !isRelativeCachable(relativeURL) {
		return "", false
	}
	return ResolveURL(baseURL, relativeURL), true
}


const OPENREPLAY_QUERY_START = "OPENREPLAY_QUERY"

func getCachePath(rawurl string) string {
	return strings.ReplaceAll(url.QueryEscape(rawurl), "%", "!") // s3 keys are ok with "!"
	// u, _ := url.Parse(rawurl)
	// s := "/" + u.Scheme + "/" + u.Hostname() + u.Path
	// if u.RawQuery != "" {
	// 	if (s[len(s) - 1] != '/') {
	// 		s += "/"
	// 	}
	// 	s += OPENREPLAY_QUERY_START + url.PathEscape(u.RawQuery)
	// }
	// return s
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


func (r *Rewriter) RewriteURL(sessionID uint64, baseURL string, relativeURL string) (string, bool) {
	// TODO: put it in one check within GetFullCachableURL
	if !isRelativeCachable(relativeURL) {
		return relativeURL, false
	}
	fullURL := ResolveURL(baseURL, relativeURL)
	if !isCachable(fullURL) {
		return relativeURL, false
	}

  u := url.URL{
	  Path: r.assetsURL.Path + getCachePathWithKey(sessionID, fullURL),
	  Host: r.assetsURL.Host,
	  Scheme: r.assetsURL.Scheme,
	}

	return u.String(), true
}

