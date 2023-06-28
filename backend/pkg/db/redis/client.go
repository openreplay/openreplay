package redis

import (
	"errors"
	"github.com/go-redis/redis"
	config "openreplay/backend/internal/config/redis"
	"strings"
)

type Client struct {
	Cfg   *config.Config
	Redis *redis.Client
}

func New(cfg *config.Config) (*Client, error) {
	if cfg == nil {
		return nil, errors.New("redis config is nil")
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
	// TODO: init client values
	return &Client{
		Cfg:   cfg,
		Redis: client,
	}, nil
}

func (c *Client) Close() error {
	return c.Redis.Close()
}
