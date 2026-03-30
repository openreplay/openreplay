package redis

import (
	"errors"
	"strings"

	"github.com/docker/distribution/context"
	"github.com/redis/go-redis/v9"

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
	if _, err := client.Ping(context.Background()).Result(); err != nil {
		return nil, err
	}
	return &Client{
		Cfg:   cfg,
		Redis: client,
	}, nil
}

func (c *Client) Ping(ctx context.Context) error {
	if c == nil || c.Redis == nil {
		return errors.New("redis client is not initialized")
	}
	return c.Redis.Ping(ctx).Err()
}

func (c *Client) Close() error {
	return c.Redis.Close()
}
