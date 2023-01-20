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
		return idxs[i][0] > idxs[j][0]
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

func ExtractURLsFromCSS(css string) []string {
	indexes := cssUrlsIndex(css)
	urls := make([]string, len(indexes))
	for _, idx := range indexes {

		f := idx[0]
		t := idx[1]
		rawurl, _ := unquote(css[f:t])
		urls = append(urls, rawurl)
	}
	return urls
}

func rewriteLinks(css string, rewrite func(rawurl string) string) string {
	for _, idx := range cssUrlsIndex(css) {
		f := idx[0]
		t := idx[1]
		rawurl, q := unquote(css[f:t])
		// why exactly quote back?
		css = css[:f] + q + rewrite(rawurl) + q + css[t:]
	}
	return css
}

func ResolveCSS(baseURL string, css string) string {
	css = rewriteLinks(css, func(rawurl string) string {
		return ResolveURL(baseURL, rawurl)
	})
	return rewritePseudoclasses(css)
}

func (r *Rewriter) RewriteCSS(sessionID uint64, baseurl string, css string) string {
	css = rewriteLinks(css, func(rawurl string) string {
		return r.RewriteURL(sessionID, baseurl, rawurl)
	})
	return rewritePseudoclasses(css)
}

func rewritePseudoclasses(css string) string {
	css = strings.Replace(css, ":hover", ".-openreplay-hover", -1)
	css = strings.Replace(css, ":focus", ".-openreplay-focus", -1)
	return css
}
