package url

import (
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
		return "", "", "", err
	}
	// u.Scheme  u.Fragment / RawFragment ?
	path := u.Path
	if u.RawPath != "" {
		path = u.RawPath
	}
	return u.Host, path, u.RawQuery, nil
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

func getURLExtension(URL string) string {
	u, err := url.Parse(URL)
	if err != nil {
		return ""
	}
	i := strings.LastIndex(u.Path, ".")
	return u.Path[i+1:]
}
