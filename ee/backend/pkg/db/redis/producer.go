package redis

import (
	"log"

	"github.com/go-redis/redis"

	"openreplay/backend/pkg/queue/types"
)

type producerImpl struct {
	client *Client
}

func (c *producerImpl) Close(timeout int) {
	log.Printf("Redis producer close")
}

func NewProducer(client *Client) types.Producer {
	return &producerImpl{
		client: client,
	}
}

func (c *producerImpl) Produce(topic string, key uint64, value []byte) error {
	args := &redis.XAddArgs{
		Stream: topic,
		Values: map[string]interface{}{
			"sessionID": key,
			"value":     value,
		},
		MaxLenApprox: c.client.Cfg.MaxLength,
	}
	_, err := c.client.Redis.XAdd(args).Result()
	return err
}

func (c *producerImpl) ProduceToPartition(topic string, partition, key uint64, value []byte) error {
	return c.Produce(topic, key, value)
}

func (c *producerImpl) Flush(timeout int) {}
