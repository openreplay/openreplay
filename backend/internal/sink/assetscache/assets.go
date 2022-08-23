package assetscache

import (
	"log"
	"openreplay/backend/internal/config/sink"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/url/assets"
)

type AssetsCache struct {
	cfg      *sink.Config
	rewriter *assets.Rewriter
	producer types.Producer
}

func New(cfg *sink.Config, rewriter *assets.Rewriter, producer types.Producer) *AssetsCache {
	return &AssetsCache{
		cfg:      cfg,
		rewriter: rewriter,
		producer: producer,
	}
}

func (e *AssetsCache) ParseAssets(sessID uint64, msg messages.Message) messages.Message {
	switch m := msg.(type) {
	case *messages.SetNodeAttributeURLBased:
		if m.Name == "src" || m.Name == "href" {
			newMsg := &messages.SetNodeAttribute{
				ID:    m.ID,
				Name:  m.Name,
				Value: e.handleURL(sessID, m.BaseURL, m.Value),
			}
			newMsg.SetMeta(msg.Meta())
			return newMsg
		} else if m.Name == "style" {
			newMsg := &messages.SetNodeAttribute{
				ID:    m.ID,
				Name:  m.Name,
				Value: e.handleCSS(sessID, m.BaseURL, m.Value),
			}
			newMsg.SetMeta(msg.Meta())
			return newMsg
		}
	case *messages.SetCSSDataURLBased:
		newMsg := &messages.SetCSSData{
			ID:   m.ID,
			Data: e.handleCSS(sessID, m.BaseURL, m.Data),
		}
		newMsg.SetMeta(msg.Meta())
		return newMsg
	case *messages.CSSInsertRuleURLBased:
		newMsg := &messages.CSSInsertRule{
			ID:    m.ID,
			Index: m.Index,
			Rule:  e.handleCSS(sessID, m.BaseURL, m.Rule),
		}
		newMsg.SetMeta(msg.Meta())
		return newMsg
	case *messages.AdoptedSSReplaceURLBased:
		newMsg := &messages.AdoptedSSReplace{
			SheetID: m.SheetID,
			Text:    e.handleCSS(sessID, m.BaseURL, m.Text),
		}
		newMsg.SetMeta(msg.Meta())
		return newMsg
	case *messages.AdoptedSSInsertRuleURLBased:
		newMsg := &messages.AdoptedSSInsertRule{
			SheetID: m.SheetID,
			Index:   m.Index,
			Rule:    e.handleCSS(sessID, m.BaseURL, m.Rule),
		}
		newMsg.SetMeta(msg.Meta())
		return newMsg
	}
	return msg
}

func (e *AssetsCache) sendAssetForCache(sessionID uint64, baseURL string, relativeURL string) {
	if fullURL, cacheable := assets.GetFullCachableURL(baseURL, relativeURL); cacheable {
		if err := e.producer.Produce(
			e.cfg.TopicCache,
			sessionID,
			messages.Encode(&messages.AssetCache{URL: fullURL}),
		); err != nil {
			log.Printf("can't send asset to cache topic, sessID: %d, err: %s", sessionID, err)
		}
	}
}

func (e *AssetsCache) sendAssetsForCacheFromCSS(sessionID uint64, baseURL string, css string) {
	for _, u := range assets.ExtractURLsFromCSS(css) { // TODO: in one shot with rewriting
		e.sendAssetForCache(sessionID, baseURL, u)
	}
}

func (e *AssetsCache) handleURL(sessionID uint64, baseURL string, url string) string {
	if e.cfg.CacheAssets {
		e.sendAssetForCache(sessionID, baseURL, url)
		return e.rewriter.RewriteURL(sessionID, baseURL, url)
	}
	return assets.ResolveURL(baseURL, url)
}

func (e *AssetsCache) handleCSS(sessionID uint64, baseURL string, css string) string {
	if e.cfg.CacheAssets {
		e.sendAssetsForCacheFromCSS(sessionID, baseURL, css)
		return e.rewriter.RewriteCSS(sessionID, baseURL, css)
	}
	return assets.ResolveCSS(baseURL, css)
}
