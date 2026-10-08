package cacher

import (
	"fmt"
	"net/url"
	"strings"
)

type originNotAllowedError struct {
	origin string
}

func (e *originNotAllowedError) Error() string {
	return fmt.Sprintf("origin %s not allowed", e.origin)
}

type originSet map[string]struct{}

func parseOrigins(raw string) (originSet, error) {
	set := originSet{}
	for _, item := range strings.Split(raw, ",") {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		u, err := url.Parse(item)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" ||
			(u.Path != "" && u.Path != "/") || u.RawQuery != "" || u.Fragment != "" || u.User != nil {
			return nil, fmt.Errorf("invalid origin %q, expected scheme://host[:port]", item)
		}
		set[originKey(u)] = struct{}{}
	}
	return set, nil
}

func originKey(u *url.URL) string {
	port := u.Port()
	if port == "" {
		if u.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}
	return strings.ToLower(u.Scheme) + "://" + strings.ToLower(u.Hostname()) + ":" + port
}

func (s originSet) allows(u *url.URL) bool {
	if len(s) == 0 {
		return true
	}
	_, ok := s[originKey(u)]
	return ok
}
