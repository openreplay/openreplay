package assets

import (
	"fmt"
	"net/url"
)

type Resolver interface {
	Lookup(fullURL string) (hash string, ok bool)
}

type Rewriter struct {
	assetsURL *url.URL
	scheme    string
	resolver  Resolver
}

// NewRewriter keeps the legacy behavior: daily key scheme.
func NewRewriter(baseOrigin string) (*Rewriter, error) {
	return NewRewriterWithScheme(baseOrigin, KeySchemeDaily, nil)
}

func NewRewriterWithScheme(baseOrigin string, scheme string, resolver Resolver) (*Rewriter, error) {
	if !ValidKeyScheme(scheme) {
		return nil, fmt.Errorf("unknown assets key scheme: %q", scheme)
	}
	assetsURL, err := url.Parse(baseOrigin)
	if err != nil {
		return nil, err
	}
	return &Rewriter{
		assetsURL: assetsURL,
		scheme:    scheme,
		resolver:  resolver,
	}, nil
}
