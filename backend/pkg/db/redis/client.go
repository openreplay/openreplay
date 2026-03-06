package redis

import (
	"context"
	"errors"

	"github.com/redis/go-redis/v9"

	config "openreplay/backend/internal/config/redis"
)

type Client struct {
	Cfg   *config.Redis
	Redis *redis.Client
}

func New(cfg *config.Redis) (*Client, error) {
	return nil, errors.New("not implemented")
}

func (c *Client) Ping(ctx context.Context) error {
	if c == nil || c.Redis == nil {
		return nil
	}
	return c.Redis.Ping(ctx).Err()
}

func (c *Client) Close() error {
	return c.Redis.Close()
}
