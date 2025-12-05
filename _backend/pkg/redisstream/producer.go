package redisstream

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"

	"openreplay/backend/pkg/env"
)

type Producer struct {
	redis        *redis.Client
	maxLenApprox int64
	ttl          time.Duration
}

func NewProducer() *Producer {
	redClient, err := getRedisClient()
	if err != nil {
		log.Fatal(err)
	}
	ttlSeconds := env.Uint64Default("REDIS_STREAMS_TTL_SEC", 14400)
	return &Producer{
		redis:        redClient,
		maxLenApprox: int64(env.Uint64("REDIS_STREAMS_MAX_LEN")),
		ttl:          time.Duration(ttlSeconds) * time.Second,
	}
}

func (p *Producer) Produce(topic string, key uint64, value []byte) error {
	ctx := context.Background()

	args := &redis.XAddArgs{
		Stream: topic,
		Values: map[string]interface{}{
			"sessionID": key,
			"value":     value,
		},
	}

	// Use MinID to trim messages older than TTL, or use MaxLen if no TTL is set
	// Redis Stream IDs are in format: <millisecondsTime>-<sequenceNumber>
	if p.ttl > 0 {
		// Calculate timestamp for messages older than TTL
		cutoffTime := time.Now().Add(-p.ttl).UnixMilli()
		// Format: milliseconds timestamp + sequence number
		args.MinID = fmt.Sprintf("%d-0", cutoffTime)
		args.Approx = true // Use approximate trimming (~) for better performance
	} else if p.maxLenApprox > 0 {
		args.MaxLen = p.maxLenApprox
		args.Approx = true
	}

	_, err := p.redis.XAdd(ctx, args).Result()
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
