package assets

import (
	"regexp"
	"sort"
	"strings"
)

// TODO: ignore  data: , escaped quotes , spaces between brackets?
var cssURLs = regexp.MustCompile(`url\(("[^"]*"|'[^']*'|[^)]*)\)`)
var cssImports = regexp.MustCompile(`@import "(.*?)"`)

func cssUrlsIndex(css string) [][]int {
	var idxs [][]int
	for _, match := range cssURLs.FindAllStringSubmatchIndex(css, -1) {
		idxs = append(idxs, match[2:])
	}
	for _, match := range cssImports.FindAllStringSubmatchIndex(css, -1) {
		idxs = append(idxs, match[2:])
	}
	sort.Slice(idxs, func(i, j int) bool {
		return idxs[i][0] < idxs[j][0]
	})
	return idxs
}

func unquote(str string) (string, string) {
	str = strings.TrimSpace(str)
	if len(str) <= 2 {
		return str, ""
	}
	if str[0] == '"' && str[len(str)-1] == '"' {
		return str[1 : len(str)-1], "\""
	}
	if str[0] == '\'' && str[len(str)-1] == '\'' {
		return str[1 : len(str)-1], "'"
	}
	return str, ""
}

func rewriteAndCollect(css string, rewrite func(rawurl string) string, collect bool) (string, []string) {
	indexes := cssUrlsIndex(css)
	if len(indexes) == 0 {
		return rewritePseudoclasses(css), nil
	}

	var b strings.Builder
	b.Grow(len(css))
	var urls []string
	if collect {
		urls = make([]string, 0, len(indexes))
	}
	last := 0
	for _, idx := range indexes {
		f := idx[0]
		t := idx[1]
		if f < last { // skip overlapping/nested matches
			continue
		}
		rawurl, q := unquote(css[f:t])
		if collect {
			urls = append(urls, rawurl)
		}
		b.WriteString(css[last:f])
		b.WriteString(q)
		b.WriteString(rewrite(rawurl))
		b.WriteString(q)
		last = t
	}
	b.WriteString(css[last:])
	return rewritePseudoclasses(b.String()), urls
}

func ResolveCSS(baseURL string, css string) string {
	out, _ := rewriteAndCollect(css, func(rawurl string) string {
		return ResolveURL(baseURL, rawurl)
	}, false)
	return out
}

func (r *Rewriter) RewriteCSS(sessionID uint64, baseurl string, css string) string {
	out, _ := rewriteAndCollect(css, func(rawurl string) string {
		return r.RewriteURL(sessionID, baseurl, rawurl)
	}, false)
	return out
}

// RewriteCSSAndExtract scans the CSS a single time: it rewrites each url()/@import
// target via the rewriter and collects the raw (pre-rewrite) URLs it found, so
// callers that need both don't have to run the regex twice (extract + rewrite).
func (r *Rewriter) RewriteCSSAndExtract(sessionID uint64, baseurl string, css string) (string, []string) {
	return rewriteAndCollect(css, func(rawurl string) string {
		return r.RewriteURL(sessionID, baseurl, rawurl)
	}, true)
}

func rewritePseudoclasses(css string) string {
	css = strings.ReplaceAll(css, ":hover", ".-openreplay-hover")
	css = strings.ReplaceAll(css, ":focus", ".-openreplay-focus")
	return css
}
