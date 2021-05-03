package url

import (
	"strings"
	_url "net/url"
)

func DiscardURLQuery(url string) string {
	return strings.Split(url, "?")[0]
} 

func GetURLParts(rawURL string) (string, string, error) {
	u, err := _url.Parse(rawURL)
	if err != nil {
		return "", "", err
	}
	return u.Host, u.RequestURI(), nil
}