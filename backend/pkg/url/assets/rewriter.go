package assets

import (
	"log"
	"net/url"
)

type Rewriter struct {
	assetsURL *url.URL
}

func NewRewriter(baseOrigin string) *Rewriter {
	assetsURL, err := url.Parse(baseOrigin)
	if err != nil {
		log.Fatal(err)
	}
	return &Rewriter{
		assetsURL: assetsURL,
	}

}
