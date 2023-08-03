package redis

import (
	"errors"
	"fmt"
	"log"
	"net"
	"sort"
	"strconv"
	"strings"

	"github.com/go-redis/redis"

	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
)

type idsInfo struct {
	id []string
	ts []int64
}
type streamPendingIDsMap map[string]*idsInfo

type consumerImpl struct {
	client     *Client
	group      string
	streams    []string
	idsPending streamPendingIDsMap
	lastTs     int64
	autoCommit bool
	event      chan *types.PartitionsRebalancedEvent
}

type QueueMessage struct {
	Data []byte
	Info *messages.BatchInfo
}

func (c *consumerImpl) ConsumeNext() error {
	//TODO implement me
	panic("implement me")
}

func (c *consumerImpl) Close() {
	//TODO implement me
	panic("implement me")
}

func NewConsumer(client *Client, group string, streams []string) types.Consumer {
	idsPending := make(streamPendingIDsMap)
	streamsCount := len(streams)
	for i := 0; i < streamsCount; i++ {
		err := client.Redis.XGroupCreateMkStream(streams[i], group, "0").Err()
		if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
			log.Fatalln(err)
		}
		idsPending[streams[i]] = new(idsInfo)
		// ">" is for never-delivered messages.
		// Otherwise - never acknowledged only
		// TODO: understand why in case of "0" it eats 100% cpu
		streams = append(streams, ">")
	}

	return &consumerImpl{
		client:     client,
		streams:    streams,
		group:      group,
		autoCommit: true,
		idsPending: idsPending,
		event:      make(chan *types.PartitionsRebalancedEvent, 4),
	}
}

func (c *consumerImpl) ConsumeNextOld() (*QueueMessage, error) {
	res, err := c.client.Redis.XReadGroup(&redis.XReadGroupArgs{
		Group:    c.group,
		Consumer: c.group,
		Streams:  c.streams,
		Count:    c.client.Cfg.ReadCount,
		Block:    c.client.Cfg.ReadBlockDuration,
	}).Result()
	if err != nil {
		if err, ok := err.(net.Error); ok && err.Timeout() {
			return nil, err
		}
		if err == redis.Nil {
			return nil, errors.New("key does not exist")
		}
		return nil, err
	}
	// TODO: remove debug logs
	log.Printf("info: res.size: %d", len(res))
	for _, r := range res {
		log.Printf("info: messages.size: %d", len(r.Messages))
		for _, m := range r.Messages {
			sessionIDString, ok := m.Values["sessionID"].(string)
			if !ok {
				return nil, fmt.Errorf("can't cast sessionID value for messageID %s", m.ID)
			}
			sessionID, err := strconv.ParseUint(sessionIDString, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("can't parse sessionID %s for messageID %s", sessionIDString, m.ID)
			}
			valueString, ok := m.Values["value"].(string)
			if !ok {
				return nil, fmt.Errorf("can't cast value for messageID %s", m.ID)
			}
			// Assuming that ID has a correct format
			idParts := strings.Split(m.ID, "-")
			ts, _ := strconv.ParseUint(idParts[0], 10, 64)
			idx, _ := strconv.ParseUint(idParts[1], 10, 64)
			if idx > 0x1FFF {
				return nil, errors.New("too many messages per ms in redis")
			}
			bID := ts<<13 | (idx & 0x1FFF) // Max: 4096 messages/ms for 69 years
			result := &QueueMessage{
				Data: []byte(valueString),
				Info: messages.NewBatchInfo(sessionID, r.Stream, bID, 0, int64(ts)),
			}
			if c.autoCommit {
				if err = c.client.Redis.XAck(r.Stream, c.group, m.ID).Err(); err != nil {
					log.Printf("Acknoledgment error for messageID %s, err: %s", m.ID, err.Error())
				}
			} else {
				c.lastTs = int64(ts)
				c.idsPending[r.Stream].id = append(c.idsPending[r.Stream].id, m.ID)
				c.idsPending[r.Stream].ts = append(c.idsPending[r.Stream].ts, int64(ts))
			}
			return result, nil

		}
	}
	return nil, errors.New("no messages")
}

func (c *consumerImpl) CommitBack(gap int64) error {
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
		if err := c.client.Redis.XAck(stream, c.group, idsInfo.id[:maxI]...).Err(); err != nil {
			return fmt.Errorf("RedisStreams: Acknoledgment error on commit %v", err)
		}
		c.idsPending[stream].id = idsInfo.id[maxI:]
		c.idsPending[stream].ts = idsInfo.ts[maxI:]
	}
	return nil
}

func (c *consumerImpl) Commit() error {
	for stream, idsInfo := range c.idsPending {
		if len(idsInfo.id) == 0 {
			continue
		}
		if err := c.client.Redis.XAck(stream, c.group, idsInfo.id...).Err(); err != nil {
			return fmt.Errorf("RedisStreams: Acknoledgment error on commit %v", err)
		}
		c.idsPending[stream].id = nil
		c.idsPending[stream].ts = nil
	}
	return nil
}

func (c *consumerImpl) Rebalanced() <-chan *types.PartitionsRebalancedEvent {
	return c.event
}
