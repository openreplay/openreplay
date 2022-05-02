package router

import (
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url/assets"
)

func (e *Router) sendAssetForCache(sessionID uint64, baseURL string, relativeURL string) {
	if fullURL, cacheable := assets.GetFullCachableURL(baseURL, relativeURL); cacheable {
		e.services.Producer.Produce(e.cfg.TopicCache, sessionID, messages.Encode(&messages.AssetCache{
			URL: fullURL,
		}))
	}
}

func (e *Router) sendAssetsForCacheFromCSS(sessionID uint64, baseURL string, css string) {
	for _, u := range assets.ExtractURLsFromCSS(css) { // TODO: in one shot with rewriting
		e.sendAssetForCache(sessionID, baseURL, u)
	}
}

func (e *Router) handleURL(sessionID uint64, baseURL string, url string) string {
	if e.cfg.CacheAssets {
		e.sendAssetForCache(sessionID, baseURL, url)
		return e.services.Rewriter.RewriteURL(sessionID, baseURL, url)
	}
	return assets.ResolveURL(baseURL, url)
}

func (e *Router) handleCSS(sessionID uint64, baseURL string, css string) string {
	if e.cfg.CacheAssets {
		e.sendAssetsForCacheFromCSS(sessionID, baseURL, css)
		return e.services.Rewriter.RewriteCSS(sessionID, baseURL, css)
	}
	return assets.ResolveCSS(baseURL, css)
}
