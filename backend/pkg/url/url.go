package url

import (
	_url "net/url"
	"strings"
)

func DiscardURLQuery(url string) string {
	return strings.Split(url, "?")[0]
}

func GetURLParts(rawURL string) (string, string, string, error) {
	rawURL = strings.Replace(rawURL, "\t", "", -1) // Other chars?
	u, err := _url.Parse(rawURL)
	if err != nil {
		return "", "", "", err
	}
	// u.Scheme  u.Fragment / RawFragment ?
	path := u.Path
	if u.RawPath != "" {
		path = u.RawPath
	}
	return u.Host, path, u.RawQuery, nil
}
