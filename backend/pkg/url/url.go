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

func getURLExtension(URL string) string {
	u, err := url.Parse(URL)
	if err != nil {
		return ""
	}
	i := strings.LastIndex(u.Path, ".")
	return u.Path[i+1:]
}

func GetResourceType(initiator string, URL string) string {
	switch initiator {
	case "xmlhttprequest", "fetch":
		return "fetch"
	case "img":
		return "img"
	default:
		switch getURLExtension(URL) {
		case "css":
			return "stylesheet"
		case "js":
			return "script"
		case "png", "gif", "jpg", "jpeg", "svg":
			return "img"
		case "mp4", "mkv", "ogg", "webm", "avi", "mp3":
			return "media"
		default:
			return "other"
		}
	}
}
