package resolver

import (
	"context"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"openreplay/backend/pkg/logger"
)

const (
	redisKeyPrefix  = "assets:v1:"
	redisTTL        = 7 * 24 * time.Hour
	opTimeout       = 100 * time.Millisecond
	positiveTTL     = 2 * time.Minute
	localOnlyTTL    = 26 * time.Hour
	negativeTTL     = 30 * time.Second
	maxLocalEntries = 200_000
)

type entry struct {
	hash string
	ok   bool
	exp  time.Time
}

type Resolver struct {
	log      logger.Logger
	rdb      *redis.Client // nil -> local-only mode
	onLookup func(hit bool)
	mu       sync.RWMutex
	m        map[string]entry
}

func New(log logger.Logger, connectionURL string, onLookup func(hit bool)) (*Resolver, error) {
	r := &Resolver{
		log:      log,
		onLookup: onLookup,
		m:        make(map[string]entry),
	}
	if connectionURL != "" {
		options, err := redis.ParseURL(connectionURL)
		if err != nil {
			return nil, err
		}
		r.rdb = redis.NewClient(options)
	}
	return r, nil
}

func (r *Resolver) positiveTTL() time.Duration {
	if r.rdb == nil {
		return localOnlyTTL
	}
	return positiveTTL
}

func (r *Resolver) Lookup(fullURL string) (string, bool) {
	hash, ok := r.lookup(fullURL)
	if r.onLookup != nil {
		r.onLookup(ok)
	}
	return hash, ok
}

func (r *Resolver) lookup(fullURL string) (string, bool) {
	now := time.Now()
	r.mu.RLock()
	e, found := r.m[fullURL]
	r.mu.RUnlock()
	if found && now.Before(e.exp) {
		return e.hash, e.ok
	}
	if r.rdb == nil {
		return "", false
	}

	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	hash, err := r.rdb.Get(ctx, redisKeyPrefix+fullURL).Result()
	switch {
	case err == nil:
		r.store(fullURL, entry{hash: hash, ok: true, exp: now.Add(positiveTTL)})
		return hash, true
	case err == redis.Nil:
		r.store(fullURL, entry{exp: now.Add(negativeTTL)})
		return "", false
	default:
		r.store(fullURL, entry{exp: now.Add(negativeTTL)})
		r.log.Warn(context.Background(), "assets resolver lookup failed: %s", err)
		return "", false
	}
}

func (r *Resolver) Set(fullURL string, hash string) {
	r.store(fullURL, entry{hash: hash, ok: true, exp: time.Now().Add(r.positiveTTL())})
	if r.rdb == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	if err := r.rdb.Set(ctx, redisKeyPrefix+fullURL, hash, redisTTL).Err(); err != nil {
		r.log.Warn(context.Background(), "assets resolver set failed: %s", err)
	}
}

func (r *Resolver) store(fullURL string, e entry) {
	now := time.Now()
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.m) >= maxLocalEntries {
		for k, old := range r.m {
			if now.After(old.exp) {
				delete(r.m, k)
			}
		}
		if len(r.m) >= maxLocalEntries { // everything is still live: shed the cache
			r.m = make(map[string]entry)
		}
	}
	r.m[fullURL] = e
}

func (r *Resolver) Ping(ctx context.Context) error {
	if r.rdb == nil {
		return nil
	}
	return r.rdb.Ping(ctx).Err()
}

func (r *Resolver) Close() error {
	if r.rdb == nil {
		return nil
	}
	return r.rdb.Close()
}
