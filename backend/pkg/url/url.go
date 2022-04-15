package url

import (
	_url "net/url"
	"strings"
)

func DiscardURLQuery(url string) string {
	return strings.Split(url, "?")[0]
}

func GetURLParts(rawURL string) (string, string, string, error) {
	u, err := _url.Parse(rawURL)
	if err != nil {
		return "", "", "", err
	}
	// u.Scheme  ?
	return u.Host, u.RawPath, u.RawQuery, nil
}
