package service

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

// FlexUint32 is a uint32 that can be unmarshaled from both JSON number and string.
type FlexUint32 uint32

func (f *FlexUint32) UnmarshalJSON(data []byte) error {
	var num float64
	if err := json.Unmarshal(data, &num); err == nil {
		*f = FlexUint32(num)
		return nil
	}
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}
	n, err := strconv.ParseUint(str, 10, 32)
	if err != nil {
		return err
	}
	*f = FlexUint32(n)
	return nil
}

type assistStatsImpl struct {
	log         logger.Logger
	pgClient    pool.Pool
	redisClient *redis.Client
	ticker      *time.Ticker
	stopChan    chan struct{}
}

type AssistStats interface {
	Stop()
}

func NewAssistStats(log logger.Logger, pgClient pool.Pool, redisClient *redis.Client) (AssistStats, error) {
	switch {
	case log == nil:
		return nil, errors.New("logger is empty")
	case pgClient == nil:
		return nil, errors.New("pg client is empty")
	case redisClient == nil:
		return nil, errors.New("redis client is empty")
	}
	stats := &assistStatsImpl{
		log:         log,
		pgClient:    pgClient,
		redisClient: redisClient,
		ticker:      time.NewTicker(time.Minute),
		stopChan:    make(chan struct{}),
	}
	stats.init()
	return stats, nil
}

func (as *assistStatsImpl) init() {
	as.log.Debug(context.Background(), "Starting assist stats")

	go func() {
		for {
			select {
			case <-as.ticker.C:
				as.loadData()
			case <-as.stopChan:
				as.log.Debug(context.Background(), "Stopping assist stats")
				return
			}
		}
	}()
}

type AssistStatsEvent struct {
	ProjectID  FlexUint32 `json:"project_id"`
	SessionID  string     `json:"session_id"`
	AgentID    string     `json:"agent_id"`
	EventID    string     `json:"event_id"`
	EventType  string     `json:"event_type"`
	EventState string     `json:"event_state"`
	Timestamp  int64      `json:"timestamp"`
}

func (as *assistStatsImpl) loadData() {
	ctx := context.Background()

	events, err := as.redisClient.LPopCount(ctx, "assist:stats", 1000).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			as.log.Debug(ctx, "No data to load from redis")
		} else {
			as.log.Error(ctx, "Failed to load data from redis: ", err)
		}
		return
	}
	if len(events) == 0 {
		as.log.Debug(ctx, "No data to load from redis")
		return
	}
	as.log.Debug(ctx, "Loaded %d events from redis", len(events))

	for _, event := range events {
		e := &AssistStatsEvent{}
		err := json.Unmarshal([]byte(event), &e)
		if err != nil {
			as.log.Error(ctx, "Failed to unmarshal event: ", err)
			continue
		}
		switch e.EventType {
		case "start":
			err = as.insertEvent(e)
		case "end":
			err = as.updateEvent(e)
		default:
			as.log.Warn(ctx, "Unknown event type: %s", e.EventType)
		}
		if err != nil {
			as.log.Error(ctx, "Failed to process event: ", err)
			continue
		}
	}
}

func (as *assistStatsImpl) insertEvent(event *AssistStatsEvent) error {
	insertQuery := `INSERT INTO assist_events (event_id, project_id, session_id, agent_id, event_type, timestamp) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (event_id) DO NOTHING`
	return as.pgClient.Exec(insertQuery, event.EventID, uint32(event.ProjectID), event.SessionID, event.AgentID, event.EventType, event.Timestamp)
}

func (as *assistStatsImpl) updateEvent(event *AssistStatsEvent) error {
	updateQuery := `UPDATE assist_events SET duration = $1 - timestamp WHERE event_id = $2`
	return as.pgClient.Exec(updateQuery, event.Timestamp, event.EventID)
}

func (as *assistStatsImpl) Stop() {
	close(as.stopChan)
	as.ticker.Stop()
}
