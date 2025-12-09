package url

import (
	"fmt"
	"net/url"
	"strings"
)

func DiscardURLQuery(url string) string {
	return strings.Split(url, "?")[0]
}

func GetURLParts(rawURL string) (string, string, string, error) {
	rawURL = strings.Replace(rawURL, "\t", "", -1) // Other chars?
	u, err := url.Parse(rawURL)
	if err != nil {
		// Try again with sanitization
		u, err = url.Parse(sanitizeURL(rawURL))
		if err != nil {
			return "", "", "", fmt.Errorf("failed to parse url with sanitizer: %s", err)
		}
	}
	path := u.Path
	if u.RawPath != "" {
		path = u.RawPath
	}
	return u.Host, path, u.RawQuery, nil
}

func sanitizeURL(raw string) string {
	var b strings.Builder
	b.Grow(len(raw))

	isHex := func(c byte) bool {
		return ('0' <= c && c <= '9') ||
			('a' <= c && c <= 'f') ||
			('A' <= c && c <= 'F')
	}

	for i := 0; i < len(raw); i++ {
		if raw[i] == '%' {
			if i+2 >= len(raw) || !isHex(raw[i+1]) || !isHex(raw[i+2]) {
				// Invalid escape, encode the '%' itself
				b.WriteString("%25")
				continue
			}
		}
		b.WriteByte(raw[i])
	}
	return b.String()
}

func GetURLQueryParams(rawURL string) (map[string]string, error) {
	rawURL = strings.Replace(rawURL, "\t", "", -1)
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	params := make(map[string]string)
	for key, values := range u.Query() {
		params[key] = values[0]
	}
	return params, nil
}
