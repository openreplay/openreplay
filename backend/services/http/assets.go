package main

import (
	"openreplay/backend/pkg/url/assets"
	"openreplay/backend/pkg/messages"
)

func sendAssetForCache(sessionID uint64, baseURL string, relativeURL string) {
	if fullURL, cacheable := assets.GetFullCachableURL(baseURL, relativeURL); cacheable {
		producer.Produce(TOPIC_CACHE, sessionID, messages.Encode(&messages.AssetCache{
			URL: fullURL,
		}))
	}
}

func sendAssetsForCacheFromCSS(sessionID uint64, baseURL string, css string) {
	for _, u := range assets.ExtractURLsFromCSS(css) { // TODO: in one shot with rewriting
		sendAssetForCache(sessionID, baseURL, u)
	}
}

func handleURL(sessionID uint64, baseURL string, url string) string {
	if CACHE_ASSESTS {
		sendAssetForCache(sessionID, baseURL, url)
		return rewriter.RewriteURL(sessionID, baseURL, url)
	}
	return assets.ResolveURL(baseURL, url)
}

func handleCSS(sessionID uint64, baseURL string, css string) string {
	if CACHE_ASSESTS {
		sendAssetsForCacheFromCSS(sessionID, baseURL, css)
		return rewriter.RewriteCSS(sessionID, baseURL, css)
	}
	return assets.ResolveCSS(baseURL, css)
}