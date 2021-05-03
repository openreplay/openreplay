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

func (r *Rewriter) RewriteCSS(sessionID uint64, baseurl string, css string) string {
	for _, idx := range cssUrlsIndex(css) {
		f := idx[0]
		t := idx[1]
		rawurl, q := unquote(css[f:t])
		// why exactly quote back?
		css = css[:f] + q + r.RewriteURL(sessionID, baseurl, rawurl) + q + css[t:]
	}
	return strings.Replace(css, ":hover", ".-asayer-hover", -1)
}
