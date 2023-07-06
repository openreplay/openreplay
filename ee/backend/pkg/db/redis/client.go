package redis

import (
	"errors"
	"strings"

	"github.com/go-redis/redis"

	config "openreplay/backend/internal/config/redis"
)

type Client struct {
	Cfg   *config.Redis
	Redis *redis.Client
}

func New(cfg *config.Redis) (*Client, error) {
	if cfg == nil {
		return nil, errors.New("redis config is nil")
	}
	if !cfg.UseRedisCache {
		return nil, errors.New("redis cache is disabled")
	}
	if cfg.ConnectionURL == "" {
		return nil, errors.New("redis connection url is empty")
	}
	connUrl := cfg.ConnectionURL
	if !strings.Contains(connUrl, "://") {
		connUrl = "redis://" + connUrl
	}
	options, err := redis.ParseURL(connUrl)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(options)
	if _, err := client.Ping().Result(); err != nil {
		return nil, err
	}
	return &Client{
		Cfg:   cfg,
		Redis: client,
	}, nil
}

func (c *Client) Close() error {
	return c.Redis.Close()
}
