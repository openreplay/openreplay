package assets

import (
	"net/url"
)

type Rewriter struct {
	assetsURL *url.URL
}

func NewRewriter(baseOrigin string) (*Rewriter, error) {
	assetsURL, err := url.Parse(baseOrigin)
	if err != nil {
		return nil, err
	}
	return &Rewriter{
		assetsURL: assetsURL,
	}, nil

}
