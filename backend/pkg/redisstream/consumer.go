package redisstream

import (
	"log"
	"net"
	"sort"
	"strconv"
	"strings"
	"time"

	_redis "github.com/go-redis/redis"
	"github.com/pkg/errors"

	"openreplay/backend/pkg/queue/types"
)

type idsInfo struct {
	id []string
	ts []int64
}
type streamPendingIDsMap map[string]*idsInfo

type Consumer struct {
	redis          *_redis.Client
	streams        []string
	group          string
	messageHandler types.MessageHandler
	idsPending     streamPendingIDsMap
	lastTs         int64
	autoCommit     bool
}

func NewConsumer(group string, streams []string, messageHandler types.MessageHandler) *Consumer {
	redis := getRedisClient()
	for _, stream := range streams {
		err := redis.XGroupCreateMkStream(stream, group, "0").Err()
		if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
			log.Fatalln(err)
		}
	}

	idsPending := make(streamPendingIDsMap)

	streamsCount := len(streams)
	for i := 0; i < streamsCount; i++ {
		// ">" is for never-delivered messages.
		// Otherwise - never acknoledged only
		// TODO: understand why in case of "0" it eats 100% cpu
		streams = append(streams, ">")

		idsPending[streams[i]] = new(idsInfo)
	}

	return &Consumer{
		redis:          redis,
		messageHandler: messageHandler,
		streams:        streams,
		group:          group,
		autoCommit:     true,
		idsPending:     idsPending,
	}
}

const READ_COUNT = 10

func (c *Consumer) ConsumeNext() error {
	// MBTODO: read in go routine, send messages to channel
	res, err := c.redis.XReadGroup(&_redis.XReadGroupArgs{
		Group:    c.group,
		Consumer: c.group,
		Streams:  c.streams,
		Count:    int64(READ_COUNT),
		Block:    200 * time.Millisecond,
	}).Result()
	if err != nil {
		if err, ok := err.(net.Error); ok && err.Timeout() {
			return nil
		}
		if err == _redis.Nil {
			return nil
		}
		return err
	}
	for _, r := range res {
		for _, m := range r.Messages {
			sessionIDString, ok := m.Values["sessionID"].(string)
			if !ok {
				return errors.Errorf("Can not cast value for messageID %v", m.ID)
			}
			sessionID, err := strconv.ParseUint(sessionIDString, 10, 64)
			if err != nil {
				return errors.Wrapf(err, "Can not parse sessionID '%v' for messageID %v", sessionID, m.ID)
			}
			valueString, ok := m.Values["value"].(string)
			if !ok {
				return errors.Errorf("Can not cast value for messageID %v", m.ID)
			}
			// assumming that ID has a correct format
			idParts := strings.Split(m.ID, "-")
			ts, _ := strconv.ParseUint(idParts[0], 10, 64)
			idx, _ := strconv.ParseUint(idParts[1], 10, 64)
			if idx > 0x1FFF {
				return errors.New("Too many messages per ms in redis")
			}
			c.messageHandler(sessionID, []byte(valueString), &types.Meta{
				Topic:     r.Stream,
				Timestamp: int64(ts),
				ID:        ts<<13 | (idx & 0x1FFF), // Max: 4096 messages/ms for 69 years
			})
			if c.autoCommit {
				if err = c.redis.XAck(r.Stream, c.group, m.ID).Err(); err != nil {
					return errors.Wrapf(err, "Acknoledgment error for messageID %v", m.ID)
				}
			} else {
				c.lastTs = int64(ts)
				c.idsPending[r.Stream].id = append(c.idsPending[r.Stream].id, m.ID)
				c.idsPending[r.Stream].ts = append(c.idsPending[r.Stream].ts, int64(ts))
			}

		}
	}
	return nil
}

func (c *Consumer) Commit() error {
	for stream, idsInfo := range c.idsPending {
		if len(idsInfo.id) == 0 {
			continue
		}
		if err := c.redis.XAck(stream, c.group, idsInfo.id...).Err(); err != nil {
			return errors.Wrapf(err, "Redisstreams: Acknoledgment error on commit %v", err)
		}
		c.idsPending[stream].id = nil
		c.idsPending[stream].ts = nil
	}
	return nil
}

func (c *Consumer) CommitBack(gap int64) error {
	if c.lastTs == 0 {
		return nil
	}
	maxTs := c.lastTs - gap

	for stream, idsInfo := range c.idsPending {
		if len(idsInfo.id) == 0 {
			continue
		}
		maxI := sort.Search(len(idsInfo.ts), func(i int) bool {
			return idsInfo.ts[i] > maxTs
		})
		if err := c.redis.XAck(stream, c.group, idsInfo.id[:maxI]...).Err(); err != nil {
			return errors.Wrapf(err, "Redisstreams: Acknoledgment error on commit %v", err)
		}
		c.idsPending[stream].id = idsInfo.id[maxI:]
		c.idsPending[stream].ts = idsInfo.ts[maxI:]
	}
	return nil
}

func (c *Consumer) Close() {
	// noop
}

func (c *Consumer) HasFirstPartition() bool {
	return false
}
