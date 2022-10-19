package assetscache

import (
	"crypto/md5"
	"io"
	"log"
	"openreplay/backend/internal/config/sink"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/url/assets"
	"time"
)

type CachedAsset struct {
	msg string
	ts  time.Time
}

type AssetsCache struct {
	cfg      *sink.Config
	rewriter *assets.Rewriter
	producer types.Producer
	cache    map[string]*CachedAsset
}

func New(cfg *sink.Config, rewriter *assets.Rewriter, producer types.Producer) *AssetsCache {
	return &AssetsCache{
		cfg:      cfg,
		rewriter: rewriter,
		producer: producer,
		cache:    make(map[string]*CachedAsset),
	}
}

func (e *AssetsCache) ParseAssets(msg messages.Message) messages.Message {
	switch m := msg.(type) {
	case *messages.SetNodeAttributeURLBased:
		if m.Name == "src" || m.Name == "href" {
			newMsg := &messages.SetNodeAttribute{
				ID:    m.ID,
				Name:  m.Name,
				Value: e.handleURL(m.SessionID(), m.BaseURL, m.Value),
			}
			newMsg.SetMeta(msg.Meta())
			return newMsg
		} else if m.Name == "style" {
			newMsg := &messages.SetNodeAttribute{
				ID:    m.ID,
				Name:  m.Name,
				Value: e.handleCSS(m.SessionID(), m.BaseURL, m.Value),
			}
			newMsg.SetMeta(msg.Meta())
			return newMsg
		}
	case *messages.SetCSSDataURLBased:
		newMsg := &messages.SetCSSData{
			ID:   m.ID,
			Data: e.handleCSS(m.SessionID(), m.BaseURL, m.Data),
		}
		newMsg.SetMeta(msg.Meta())
		return newMsg
	case *messages.CSSInsertRuleURLBased:
		newMsg := &messages.CSSInsertRule{
			ID:    m.ID,
			Index: m.Index,
			Rule:  e.handleCSS(m.SessionID(), m.BaseURL, m.Rule),
		}
		newMsg.SetMeta(msg.Meta())
		return newMsg
	case *messages.AdoptedSSReplaceURLBased:
		newMsg := &messages.AdoptedSSReplace{
			SheetID: m.SheetID,
			Text:    e.handleCSS(m.SessionID(), m.BaseURL, m.Text),
		}
		newMsg.SetMeta(msg.Meta())
		return newMsg
	case *messages.AdoptedSSInsertRuleURLBased:
		newMsg := &messages.AdoptedSSInsertRule{
			SheetID: m.SheetID,
			Index:   m.Index,
			Rule:    e.handleCSS(m.SessionID(), m.BaseURL, m.Rule),
		}
		newMsg.SetMeta(msg.Meta())
		return newMsg
	}
	return msg
}

func (e *AssetsCache) sendAssetForCache(sessionID uint64, baseURL string, relativeURL string) {
	if fullURL, cacheable := assets.GetFullCachableURL(baseURL, relativeURL); cacheable {
		assetMessage := &messages.AssetCache{URL: fullURL}
		if err := e.producer.Produce(
			e.cfg.TopicCache,
			sessionID,
			assetMessage.Encode(),
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
	// Try to find asset in cache
	h := md5.New()
	io.WriteString(h, baseURL)
	io.WriteString(h, url)
	hash := string(h.Sum(nil))
	if cachedAsset, ok := e.cache[hash]; ok {
		if time.Now().Sub(cachedAsset.ts).Minutes() < 60 {
			log.Printf("got asset from cache")
			return cachedAsset.msg
		}
	}
	// Parse fresh cache asset and save to in-memory cache
	var res string
	if e.cfg.CacheAssets {
		e.sendAssetForCache(sessionID, baseURL, url)
		res = e.rewriter.RewriteURL(sessionID, baseURL, url)
	} else {
		res = assets.ResolveURL(baseURL, url)
	}
	e.cache[hash] = &CachedAsset{
		msg: res,
		ts:  time.Now(),
	}
	log.Printf("save asset to cache")
	return res
}

func (e *AssetsCache) handleCSS(sessionID uint64, baseURL string, css string) string {
	// Try to find asset in cache
	h := md5.New()
	io.WriteString(h, baseURL)
	io.WriteString(h, css)
	hash := string(h.Sum(nil))
	if cachedAsset, ok := e.cache[hash]; ok {
		if time.Now().Sub(cachedAsset.ts).Minutes() < 60 {
			log.Printf("got asset from cache")
			return cachedAsset.msg
		}
	}
	// Parse fresh cache asset and save to in-memory cache
	var res string
	if e.cfg.CacheAssets {
		e.sendAssetsForCacheFromCSS(sessionID, baseURL, css)
		res = e.rewriter.RewriteCSS(sessionID, baseURL, css)
	} else {
		res = assets.ResolveCSS(baseURL, css)
	}
	e.cache[hash] = &CachedAsset{
		msg: res,
		ts:  time.Now(),
	}
	log.Printf("save asset to cache")
	return res
}
