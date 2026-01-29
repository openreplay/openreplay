package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sdk/model"
	"openreplay/backend/pkg/sessions"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/google/uuid"
)

const (
	leaderLockKey             = "pa-updater:leader-lock"
	leaderLockTTL             = 5 * time.Minute
	leaderLockRefreshInterval = 1 * time.Minute
)

type SdkDataSaver interface {
	Stop()
}

type dataSaverImpl struct {
	cfg               *db.Config
	log               logger.Logger
	ch                clickhouse.Connector
	redis             *redis.Client
	users             Users
	sessions          sessions.Sessions
	consumer          types.Consumer
	done              chan struct{}
	conn              driver.Conn
	startTime         int
	endTime           int
	currUsersBatch    []UserRecord
	currUserIndex     int
	lastTs            time.Time
	leaderToken       string
	isLeader          bool
	allUsersProcessed bool
}

func New(cfg *db.Config, log logger.Logger, ch clickhouse.Connector, sessions sessions.Sessions, users Users, conn driver.Conn, redis *redis.Client) (SdkDataSaver, error) {
	ds := &dataSaverImpl{
		cfg:         cfg,
		log:         log,
		ch:          ch,
		redis:       redis,
		users:       users,
		sessions:    sessions,
		done:        make(chan struct{}, 1),
		conn:        conn,
		lastTs:      time.Now(),
		leaderToken: uuid.New().String(),
	}
	var err error
	ds.startTime, err = parseHHMM(cfg.PAUpdaterStartTime)
	if err != nil {
		log.Warn(context.Background(), "failed to parse pa-updater start time: %s", err)
	}
	ds.endTime, err = parseHHMM(cfg.PAUpdaterEndTime)
	if err != nil {
		log.Warn(context.Background(), "failed to parse pa-updater end time: %s", err)
	}

	ds.consumer, err = queue.NewConsumer(
		log,
		cfg.GroupAnalytics,
		[]string{
			cfg.TopicRawAnalytics,
		},
		messages.NewImagesMessageIterator(func(data []byte, sessID uint64) {
			ds.log.Info(context.Background(), "sdk data: %s", string(data))
			sdkDataBatch := &model.SdkDataBatch{}
			if err := json.Unmarshal(data, sdkDataBatch); err != nil {
				ds.log.Error(context.Background(), "can't unmarshal message: %s", err)
				return
			}

			ds.log.Info(context.Background(), "new analytics for session: %d, user actions: %d, events: %d",
				sessID, len(sdkDataBatch.Data.UserActions), len(sdkDataBatch.Data.Events))
			sessInfo, err := ds.sessions.Get(sessID)
			if err != nil {
				ds.log.Error(context.Background(), "can't get session info: %s", err)
				return
			}

			for _, action := range sdkDataBatch.Data.UserActions {
				ds.log.Info(context.Background(), "userAction: %+v", action)
				if action.UserID == "" {
					ds.log.Debug(context.Background(), "empty userID for session: %d", sessID)
					continue
				}
				switch action.Type {
				case model.UserActionIdentify:
					if err = ds.users.Add(sessInfo, model.NewUser(action.UserID)); err != nil {
						ds.log.Error(context.Background(), "can't add user to session: %d, err: %s", sessID, err)
						continue
					}
				case model.UserActionDelete:
					if err = ds.users.Delete(sessInfo.ProjectID, action.UserID); err != nil {
						ds.log.Error(context.Background(), "can't delete user: %s", err)
					}
				default:
					if action.Payload == nil || len(action.Payload) == 0 {
						ds.log.Warn(context.Background(), "empty payload")
						continue
					}
					user, err := ds.users.Get(sessInfo.ProjectID, action.UserID)
					if err != nil {
						ds.log.Error(context.Background(), "can't get user: %s", err)
						continue
					}

					switch action.Type {
					case model.UserActionSetProperty:
						for key, val := range action.Payload {
							user.SetProperty(key, val)
						}
					case model.UserActionSetPropertyOnce:
						for key, val := range action.Payload {
							user.SetPropertyOnce(key, val)
						}
					case model.UserActionIncrementProperty:
						for key, val := range action.Payload {
							user.IncrementProperty(key, val)
						}
					}
					if err = ds.users.Update(user); err != nil {
						ds.log.Error(context.Background(), "can't insert user: %s", err)
					}
				}
			}

			for _, event := range sdkDataBatch.Data.Events {
				customEvent := &messages.CustomEvent{
					Name:    event.Name,
					Payload: string(event.Payload),
				}
				customEvent.SetSessionID(sessID)
				customEvent.Timestamp = uint64(event.Timestamp)
				if err = ds.ch.InsertCustom(sessInfo, customEvent); err != nil {
					ds.log.Error(context.Background(), "can't insert custom event: %s", err)
					continue
				}
			}
		}, nil, true),
		false,
		1024*1024,
		nil,
		types.NoReadBackGap,
	)
	if err != nil {
		return nil, err
	}
	go ds.run()
	return ds, nil
}

func parseHHMM(s string) (minutes int, err error) {
	parts := strings.Split(s, ":")
	if len(parts) != 2 {
		return -1, fmt.Errorf("expected HH:MM, got %q", s)
	}
	h, err := strconv.Atoi(parts[0])
	if err != nil || h < 0 || h > 23 {
		return -1, fmt.Errorf("bad hour in %q", s)
	}
	m, err := strconv.Atoi(parts[1])
	if err != nil || m < 0 || m > 59 {
		return -1, fmt.Errorf("bad minute in %q", s)
	}
	return h*60 + m, nil
}

func inWindow(now time.Time, startMin, endMin int) bool {
	if startMin < 0 || endMin < 0 || startMin == endMin {
		return false
	}
	curMin := now.Hour()*60 + now.Minute()

	if startMin < endMin {
		return curMin >= startMin && curMin < endMin
	}
	return curMin >= startMin || curMin < endMin
}

func (ds *dataSaverImpl) tryAcquireLeaderLock(ctx context.Context) bool {
	if ds.redis == nil {
		ds.isLeader = true
		return true
	}

	ok, err := ds.redis.Redis.SetNX(ctx, leaderLockKey, ds.leaderToken, leaderLockTTL).Result()
	if err != nil {
		ds.log.Error(ctx, "failed to acquire leader lock: %s", err)
		return false
	}
	if ok {
		ds.isLeader = true
		ds.log.Info(ctx, "acquired leader lock, this instance is now the leader")
		return true
	}

	currentToken, err := ds.redis.Redis.Get(ctx, leaderLockKey).Result()
	if err != nil {
		ds.log.Debug(ctx, "failed to check current leader: %s", err)
		return false
	}
	if currentToken == ds.leaderToken {
		ds.isLeader = true
		return true
	}
	ds.log.Debug(ctx, "another instance is the leader")
	return false
}

func (ds *dataSaverImpl) refreshLeaderLock(ctx context.Context) bool {
	if ds.redis == nil || !ds.isLeader {
		return ds.isLeader
	}

	script := `
		if redis.call("GET", KEYS[1]) == ARGV[1] then
			return redis.call("PEXPIRE", KEYS[1], ARGV[2])
		else
			return 0
		end
	`
	result, err := ds.redis.Redis.Eval(ctx, script, []string{leaderLockKey}, ds.leaderToken, leaderLockTTL.Milliseconds()).Int()
	if err != nil {
		ds.log.Error(ctx, "failed to refresh leader lock: %s", err)
		ds.isLeader = false
		return false
	}
	if result == 0 {
		ds.log.Warn(ctx, "lost leader lock (token mismatch)")
		ds.isLeader = false
		return false
	}
	ds.log.Debug(ctx, "refreshed leader lock")
	return true
}

func (ds *dataSaverImpl) releaseLeaderLock(ctx context.Context) {
	if ds.redis == nil || !ds.isLeader {
		return
	}

	script := `
		if redis.call("GET", KEYS[1]) == ARGV[1] then
			return redis.call("DEL", KEYS[1])
		else
			return 0
		end
	`
	_, err := ds.redis.Redis.Eval(ctx, script, []string{leaderLockKey}, ds.leaderToken).Result()
	if err != nil {
		ds.log.Error(ctx, "failed to release leader lock: %s", err)
	} else {
		ds.log.Info(ctx, "released leader lock")
	}
	ds.isLeader = false
}

func (ds *dataSaverImpl) run() {
	ctx := context.Background()
	updateTimer := time.NewTimer(0)
	lockRefreshTimer := time.NewTicker(leaderLockRefreshInterval)
	defer updateTimer.Stop()
	defer lockRefreshTimer.Stop()
	defer ds.releaseLeaderLock(ctx)

	wasInWindow := false

	for {
		select {
		case <-updateTimer.C:
			now := time.Now()
			inWin := inWindow(now, ds.startTime, ds.endTime)

			if inWin && !wasInWindow {
				ds.log.Info(ctx, "entering maintenance window, resetting state")
				ds.allUsersProcessed = false
				ds.currUsersBatch = nil
				ds.currUserIndex = 0
				ds.lastTs = time.Now()
			}
			wasInWindow = inWin

			if inWin {
				if ds.allUsersProcessed {
					ds.log.Debug(ctx, "all users processed, waiting for next maintenance window")
					updateTimer.Reset(ds.cfg.PAUpdaterTickDuration)
					continue
				}

				if !ds.isLeader {
					if !ds.tryAcquireLeaderLock(ctx) {
						ds.log.Debug(ctx, "not the leader, skipping maintenance work")
						updateTimer.Reset(ds.cfg.PAUpdaterTickDuration)
						continue
					}
				}

				ds.log.Info(ctx, "run events updater (leader)")
				if err := ds.updateEvents(ctx); err != nil {
					ds.log.Error(ctx, "can't update events: %s", err)
				}
			} else if ds.isLeader {
				ds.releaseLeaderLock(ctx)
			}
			updateTimer.Reset(ds.cfg.PAUpdaterTickDuration)

		case <-lockRefreshTimer.C:
			if ds.isLeader {
				ds.refreshLeaderLock(ctx)
			}

		case <-ds.done:
			return

		default:
			if err := ds.consumer.ConsumeNext(); err != nil {
				ds.log.Error(ctx, "Error on consumption: %v", err)
			}
		}
	}
}

func (ds *dataSaverImpl) updateEvents(ctx context.Context) error {
	if err := ds.loadUsersBatch(ctx); err != nil {
		return err
	}

	if len(ds.currUsersBatch) == 0 {
		ds.log.Info(ctx, "no more users to process, marking as done for this window")
		ds.allUsersProcessed = true
		return nil
	}

	batch, err := clickhouse.NewBulk(ds.conn, nil, "updatedEvents", insertEventsQuery,
		ds.cfg.CHSendBatchSizeLimit+ds.cfg.BatchSizeLimit+1)
	if err != nil {
		return err
	}

	totalEventsProcessed := 0

	for ds.currUserIndex < len(ds.currUsersBatch) {
		user := &ds.currUsersBatch[ds.currUserIndex]
		ds.log.Debug(ctx, "processing user: project_id=%d, distinct_id=%s, user_id=%s",
			user.ProjectID, user.DistinctID, user.UserID)

		eventsProcessed, err := ds.processUserEvents(ctx, batch, user)
		if err != nil {
			ds.log.Error(ctx, "can't process events for user %s: %s", user.UserID, err)
			// Move to next user anyway
		}
		totalEventsProcessed += eventsProcessed
		ds.lastTs = user.Timestamp
		ds.currUserIndex++

		if totalEventsProcessed >= ds.cfg.CHSendBatchSizeLimit {
			ds.log.Debug(ctx, "reached batch limit (%d events), will continue next tick", totalEventsProcessed)
			break
		}
	}

	if err := batch.Send(); err != nil {
		return fmt.Errorf("failed to send batch: %w", err)
	}
	ds.log.Info(ctx, "processed %d events for %d users", totalEventsProcessed, ds.currUserIndex)

	if ds.currUserIndex >= len(ds.currUsersBatch) {
		ds.log.Debug(ctx, "finished current users batch, will load next batch")
		ds.currUsersBatch = nil
		ds.currUserIndex = 0
	}
	return nil
}

// Parameters: timestamp + limit size
var selectUsers = `SELECT *
FROM (
    SELECT project_id, distinct_id, "$user_id", _timestamp
    FROM product_analytics.users_distinct_id
    ORDER BY _timestamp DESC
    LIMIT 1 BY project_id, distinct_id) AS raw
WHERE _timestamp < ?
ORDER BY _timestamp ASC
LIMIT ?;`

func (ds *dataSaverImpl) loadUsersBatch(ctx context.Context) error {
	if len(ds.currUsersBatch) > 0 && ds.currUserIndex < len(ds.currUsersBatch) {
		return nil
	}
	ds.currUsersBatch = make([]UserRecord, 0, ds.cfg.CHReadUsersSizeLimit)
	ds.currUserIndex = 0

	if err := ds.conn.Select(ctx, &ds.currUsersBatch, selectUsers, ds.lastTs, ds.cfg.CHReadUsersSizeLimit); err != nil {
		if strings.Contains(err.Error(), "no rows in result set") {
			ds.currUsersBatch = nil
			return nil
		}
		return fmt.Errorf("failed to load users batch: %w", err)
	}
	if len(ds.currUsersBatch) == 0 {
		ds.log.Info(ctx, "no more users found, all users processed")
		return nil
	}

	ds.log.Info(ctx, "loaded batch of %d users", len(ds.currUsersBatch))
	return nil
}

func (ds *dataSaverImpl) processUserEvents(ctx context.Context, batch clickhouse.Bulk, user *UserRecord) (int, error) {
	totalCount := 0
	offset := 0

	for {
		rows := make([]UserEvent, 0, ds.cfg.CHReadBatchSizeLimit)
		if err := ds.conn.Select(ctx, &rows, selectEventsQuery,
			user.ProjectID, user.DistinctID, ds.cfg.CHReadBatchSizeLimit, offset); err != nil {
			return totalCount, fmt.Errorf("failed to select events: %w", err)
		}
		if len(rows) == 0 {
			if totalCount == 0 {
				ds.log.Debug(ctx, "no events without user_id for user: %s", user.UserID)
			}
			break
		}
		ds.log.Debug(ctx, "found %d events to update for user: %s (offset: %d)", len(rows), user.UserID, offset)

		count, err := addUserEvents(batch, rows, user)
		if err != nil {
			return totalCount + count, fmt.Errorf("failed to add events to batch: %w", err)
		}
		totalCount += count
		offset += count

		if len(rows) < ds.cfg.CHReadBatchSizeLimit {
			break
		}
	}

	if totalCount > 0 {
		ds.log.Debug(ctx, "processed total %d events for user: %s", totalCount, user.UserID)
	}

	return totalCount, nil
}

func addUserEvents(batch clickhouse.Bulk, rows []UserEvent, userRec *UserRecord) (int, error) {
	for i := 0; i < len(rows); i++ {
		if err := batch.Append(
			rows[i].SessionID,
			userRec.ProjectID,
			rows[i].EventID,
			rows[i].EventName,
			rows[i].CreatedAt,
			rows[i].Timestamp,
			userRec.UserID,
			rows[i].DeviceID,
			userRec.UserID,
			rows[i].AutoCapture,
			rows[i].Device,
			rows[i].OSVersion,
			rows[i].Os,
			rows[i].Browser,
			rows[i].Referrer,
			rows[i].Country,
			rows[i].State,
			rows[i].City,
			rows[i].CurrentURL,
			rows[i].DurationS,
			rows[i].ErrorID,
			rows[i].IssueType,
			rows[i].IssueID,
			rows[i].ACProperties,
			rows[i].Properties,
		); err != nil {
			return i, err
		}
	}
	return len(rows), nil
}

type UserRecord struct {
	ProjectID  uint16    `ch:"project_id"`
	DistinctID string    `ch:"distinct_id"`
	UserID     string    `ch:"$user_id"`
	Timestamp  time.Time `ch:"_timestamp"`
}

var selectEventsQuery = `SELECT *
FROM (SELECT session_id, event_id, "$event_name", created_at, "$time", "$device_id", "$auto_captured", 
       "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", 
       "$duration_s", error_id, issue_type, issue_id, "$properties", properties, "$user_id"
      FROM product_analytics.events
      WHERE project_id = ? AND "$device_id" = ? -- TODO: change the condition in case of overwriting device_id
      ORDER BY _timestamp DESC
      LIMIT 1 BY event_id, created_at)
WHERE empty("$user_id") LIMIT ? OFFSET ?;`

var insertEventsQuery = `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, 
                                      "$time", distinct_id, "$device_id", "$user_id", "$auto_captured", "$device", 
                                      "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", 
                                      "$current_url", "$duration_s", error_id, issue_type, issue_id, "$properties", 
                                      properties) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

type UserEvent struct {
	SessionID    uint64     `ch:"session_id"`
	EventID      string     `ch:"event_id"`
	EventName    string     `ch:"$event_name"`
	CreatedAt    time.Time  `ch:"created_at"`
	Timestamp    uint32     `ch:"$time"`
	DeviceID     string     `ch:"$device_id"`
	AutoCapture  bool       `ch:"$auto_captured"`
	Device       string     `ch:"$device"`
	OSVersion    string     `ch:"$os_version"`
	Os           string     `ch:"$os"`
	Browser      string     `ch:"$browser"`
	Referrer     *string    `ch:"$referrer"`
	Country      string     `ch:"$country"`
	State        string     `ch:"$state"`
	City         string     `ch:"$city"`
	CurrentURL   string     `ch:"$current_url"`
	DurationS    uint16     `ch:"$duration_s"`
	ErrorID      string     `ch:"error_id"`
	IssueType    string     `ch:"issue_type"`
	IssueID      string     `ch:"issue_id"`
	ACProperties chcol.JSON `ch:"$properties"`
	Properties   chcol.JSON `ch:"properties"`
	UserID       *string    `ch:"$user_id"`
}

func (ds *dataSaverImpl) Stop() {
	ds.done <- struct{}{}
}
