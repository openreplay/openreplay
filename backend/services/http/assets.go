package main

import (
	"openreplay/backend/pkg/url/assets"
	"openreplay/backend/pkg/messages"
)

func sendAssetForCache(sessionID uint64, baseURL string, relativeURL string) {
	if fullURL, cachable := assets.GetFullCachableURL(baseURL, relativeURL); cachable {
		producer.Produce(topicTrigger, sessionID, messages.Encode(&messages.AssetCache{
			URL: fullURL,
		}))
	}
}

func sendAssetsForCacheFromCSS(sessionID uint64, baseURL string, css string) {
	for _, u := range assets.ExtractURLsFromCSS(css) { // TODO: in one shot with rewriting
		sendAssetForCache(sessionID, baseURL, u)
	}
}