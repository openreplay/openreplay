package redisstream

import (
	"github.com/go-redis/redis"

	"openreplay/backend/pkg/env"
)

type Producer struct {
	redis        *redis.Client
	maxLenApprox int64
}

func NewProducer() *Producer {
	return &Producer{
		redis:        getRedisClient(),
		maxLenApprox: int64(env.Uint64("REDIS_STREAMS_MAX_LEN")),
	}
}

func (p *Producer) Produce(topic string, key uint64, value []byte) error {
	args := &redis.XAddArgs{
		Stream: topic,
		Values: map[string]interface{}{
			"sessionID": key,
			"value":     value,
		},
	}
	args.MaxLenApprox = p.maxLenApprox

	_, err := p.redis.XAdd(args).Result()
	if err != nil {
		return err
	}
	return nil
}

func (p *Producer) ProduceToPartition(topic string, partition, key uint64, value []byte) error {
	// not implemented
	return nil
}

func (p *Producer) Close(_ int) {
	// noop
}
func (p *Producer) Flush(_ int) {
	// noop
}
