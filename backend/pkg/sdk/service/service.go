package service

import (
	"context"
	"encoding/json"
	"errors"
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

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/google/uuid"
)

const (
	leaderLockKey             = "pa-updater:leader-lock"
	leaderLockTTL             = 5 * time.Minute
	leaderLockRefreshInterval = 1 * time.Minute
	// devicesPerQuery bounds the size of the IN clause in selectEventsQuery
	devicesPerQuery = 500
	zeroUUID        = "00000000-0000-0000-0000-000000000000"
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
			ds.log.Debug(context.Background(), "sdk data: %s", string(data))
			sdkDataBatch := &model.SdkDataBatch{}
			if err := json.Unmarshal(data, sdkDataBatch); err != nil {
				ds.log.Error(context.Background(), "can't unmarshal message: %s", err)
				return
			}

			ds.log.Debug(context.Background(), "new analytics for session: %d, user actions: %d, events: %d",
				sessID, len(sdkDataBatch.Data.UserActions), len(sdkDataBatch.Data.Events))
			sessInfo, err := ds.sessions.Get(sessID)
			if err != nil {
				ds.log.Error(context.Background(), "can't get session info: %s", err)
				return
			}

			for _, action := range sdkDataBatch.Data.UserActions {
				ds.log.Debug(context.Background(), "userAction: %+v", action)
				action.UserID = strings.TrimSpace(action.UserID)
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
					isNew := errors.Is(err, ErrUserNotFound)
					if err != nil && !isNew {
						ds.log.Error(context.Background(), "can't get user: %s, userID: %s", err, action.UserID)
						continue
					}
					// User hasn't been identified yet (or has been deleted);
					// create a new one, so the property update (or event) isn't dropped.
					if isNew {
						ds.log.Warn(context.Background(), "user not found, creating new user from session: %d, userID: %s", sessID, action.UserID)
						user = model.NewUser(action.UserID)
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
					if isNew {
						if err = ds.users.Create(sessInfo, user); err != nil {
							ds.log.Error(context.Background(), "can't create user: %s, userID: %s", err, action.UserID)
						}
					} else if err = ds.users.Update(user); err != nil {
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
	if oc, ok := ds.consumer.(interface {
		clickhouse.OffsetCommitter
		SetProcessedHook(func(topic string, partition int32, offset int64))
	}); ok {
		ds.ch.AddCommitter(oc)
		oc.SetProcessedHook(ds.ch.TrackOffset)
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
	batch, err := clickhouse.NewBatch(ds.log, ds.conn, nil, "updatedEvents", insertEventsQuery,
		ds.cfg.CHSendBatchSizeLimit+ds.cfg.BatchSizeLimit+1)
	if err != nil {
		return err
	}

	totalEventsProcessed := 0
	totalUsersProcessed := 0

	for {
		if err := ds.loadUsersBatch(ctx); err != nil {
			return err
		}

		if len(ds.currUsersBatch) == 0 {
			ds.log.Info(ctx, "no more users to process, marking as done for this window")
			ds.allUsersProcessed = true
			break
		}

		for ds.currUserIndex < len(ds.currUsersBatch) {
			end := min(ds.currUserIndex+devicesPerQuery, len(ds.currUsersBatch))
			chunk := ds.currUsersBatch[ds.currUserIndex:end]
			ds.log.Debug(ctx, "processing users %d..%d of batch", ds.currUserIndex, end)

			eventsProcessed, completed, err := ds.processUsersEvents(ctx, batch, chunk,
				ds.cfg.CHSendBatchSizeLimit-totalEventsProcessed)
			if err != nil {
				ds.log.Error(ctx, "can't process events for users chunk: %s", err)
				// Move to the next chunk anyway
				completed = true
			}
			totalEventsProcessed += eventsProcessed
			if !completed {
				// Batch limit reached mid-chunk: keep the cursor on this chunk so the next
				// tick re-processes it; events sent in this batch will carry a user_id and
				// be filtered out by the HAVING clause.
				ds.log.Debug(ctx, "reached batch limit (%d events) mid-chunk, will continue next tick", totalEventsProcessed)
				break
			}
			totalUsersProcessed += len(chunk)
			ds.lastTs = chunk[len(chunk)-1].Timestamp
			ds.currUserIndex = end

			if totalEventsProcessed >= ds.cfg.CHSendBatchSizeLimit {
				ds.log.Debug(ctx, "reached batch limit (%d events), will continue next tick", totalEventsProcessed)
				break
			}
		}

		if ds.currUserIndex >= len(ds.currUsersBatch) {
			ds.currUsersBatch = nil
			ds.currUserIndex = 0
		}

		if totalEventsProcessed >= ds.cfg.CHSendBatchSizeLimit {
			break
		}
	}

	if err := batch.Send(); err != nil {
		return fmt.Errorf("failed to send batch: %w", err)
	}
	ds.log.Info(ctx, "processed %d events for %d users", totalEventsProcessed, totalUsersProcessed)
	return nil
}

// Parameters: timestamp + limit size
var selectUsers = `
SELECT project_id, distinct_id, "$user_id", _timestamp
FROM product_analytics.users_distinct_id FINAL
WHERE _timestamp < ?
ORDER BY _timestamp DESC
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

// processUsersEvents updates events for a chunk of users with one query series per project.
// It returns the number of events appended and whether the whole chunk was processed;
// completed=false means the events budget ran out and the chunk must be re-processed later.
func (ds *dataSaverImpl) processUsersEvents(ctx context.Context, batch clickhouse.Batch, users []UserRecord, budget int) (int, bool, error) {
	devicesByProject := make(map[uint16][]string)
	usersByDevice := make(map[uint16]map[string]*UserRecord)
	for i := range users {
		user := &users[i]
		devicesByProject[user.ProjectID] = append(devicesByProject[user.ProjectID], user.DistinctID)
		if usersByDevice[user.ProjectID] == nil {
			usersByDevice[user.ProjectID] = make(map[string]*UserRecord)
		}
		usersByDevice[user.ProjectID][user.DistinctID] = user
	}

	total := 0
	for projectID, deviceIDs := range devicesByProject {
		count, completed, err := ds.processProjectEvents(ctx, batch, projectID, deviceIDs, usersByDevice[projectID], budget-total)
		total += count
		if err != nil {
			return total, false, err
		}
		if !completed {
			return total, false, nil
		}
	}
	return total, true, nil
}

func (ds *dataSaverImpl) processProjectEvents(ctx context.Context, batch clickhouse.Batch, projectID uint16,
	deviceIDs []string, usersByDevice map[string]*UserRecord, budget int) (int, bool, error) {
	if budget <= 0 {
		return 0, false, nil
	}

	lastEventID := zeroUUID
	total := 0
	for {
		rows := make([]UserEvent, 0, ds.cfg.CHReadBatchSizeLimit)
		if err := ds.conn.Select(ctx, &rows, selectEventsQuery,
			projectID, deviceIDs, lastEventID, ds.cfg.CHReadBatchSizeLimit); err != nil {
			return total, false, fmt.Errorf("failed to select events: %w", err)
		}
		if len(rows) == 0 {
			break
		}
		ds.log.Debug(ctx, "found %d events to update for project: %d (cursor: %s)", len(rows), projectID, lastEventID)

		count, err := addUserEvents(batch, rows, usersByDevice)
		total += count
		if err != nil {
			return total, false, fmt.Errorf("failed to add events to batch: %w", err)
		}
		lastEventID = rows[len(rows)-1].EventID

		if len(rows) < ds.cfg.CHReadBatchSizeLimit {
			break
		}
		if total >= budget {
			return total, false, nil
		}
	}
	return total, true, nil
}

func addUserEvents(batch clickhouse.Batch, rows []UserEvent, usersByDevice map[string]*UserRecord) (int, error) {
	added := 0
	for i := 0; i < len(rows); i++ {
		userRec, ok := usersByDevice[rows[i].DeviceID]
		if !ok {
			continue
		}
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
			return added, err
		}
		added++
	}
	return added, nil
}

type UserRecord struct {
	ProjectID  uint16    `ch:"project_id"`
	DistinctID string    `ch:"distinct_id"`
	UserID     string    `ch:"$user_id"`
	Timestamp  time.Time `ch:"_timestamp"`
}

// no need to transform properties and $properties toString if you are reading map[string]interface{}, it makes the query faster
// Parameters: project_id, device_ids, last event_id cursor, limit.
// GROUP BY + argMax dedups versions without sorting; the HAVING keeps the
// "check user_id after dedup" semantics, so already-updated events are excluded.
var selectEventsQuery = `SELECT "$device_id", session_id, event_id, created_at,
       argMax("$event_name", _timestamp) AS "$event_name",
       argMax("$time", _timestamp) AS "$time",
       argMax("$auto_captured", _timestamp) AS "$auto_captured",
       argMax("$device", _timestamp) AS "$device",
       argMax("$os_version", _timestamp) AS "$os_version",
       argMax("$os", _timestamp) AS "$os",
       argMax("$browser", _timestamp) AS "$browser",
       argMax("$referrer", _timestamp) AS "$referrer",
       argMax("$country", _timestamp) AS "$country",
       argMax("$state", _timestamp) AS "$state",
       argMax("$city", _timestamp) AS "$city",
       argMax("$current_url", _timestamp) AS "$current_url",
       argMax("$duration_s", _timestamp) AS "$duration_s",
       argMax(error_id, _timestamp) AS error_id,
       argMax(issue_type, _timestamp) AS issue_type,
       argMax(issue_id, _timestamp) AS issue_id,
       argMax("$properties", _timestamp) AS "$properties",
       argMax(properties, _timestamp) AS properties
FROM product_analytics.events
WHERE project_id = ? AND "$device_id" IN (?)
	AND _timestamp > now() - INTERVAL 2 DAY AND created_at > now() - INTERVAL 3 DAY
	AND event_id > toUUID(?)
GROUP BY "$device_id", session_id, event_id, created_at
HAVING empty(argMax("$user_id", _timestamp))
ORDER BY event_id
LIMIT ?;`

var insertEventsQuery = `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, 
                                      "$time", distinct_id, "$device_id", "$user_id", "$auto_captured", "$device", 
                                      "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", 
                                      "$current_url", "$duration_s", error_id, issue_type, issue_id, "$properties", 
                                      properties) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

type UserEvent struct {
	SessionID    uint64                 `ch:"session_id"`
	EventID      string                 `ch:"event_id"`
	EventName    string                 `ch:"$event_name"`
	CreatedAt    time.Time              `ch:"created_at"`
	Timestamp    uint32                 `ch:"$time"`
	DeviceID     string                 `ch:"$device_id"`
	AutoCapture  bool                   `ch:"$auto_captured"`
	Device       string                 `ch:"$device"`
	OSVersion    string                 `ch:"$os_version"`
	Os           string                 `ch:"$os"`
	Browser      string                 `ch:"$browser"`
	Referrer     *string                `ch:"$referrer"`
	Country      string                 `ch:"$country"`
	State        string                 `ch:"$state"`
	City         string                 `ch:"$city"`
	CurrentURL   string                 `ch:"$current_url"`
	DurationS    uint16                 `ch:"$duration_s"`
	ErrorID      string                 `ch:"error_id"`
	IssueType    string                 `ch:"issue_type"`
	IssueID      string                 `ch:"issue_id"`
	ACProperties map[string]interface{} `ch:"$properties"`
	Properties   map[string]interface{} `ch:"properties"`
}

func (ds *dataSaverImpl) Stop() {
	ds.done <- struct{}{}
}
