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
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sdk/model"
	"openreplay/backend/pkg/sessions"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type SdkDataSaver interface {
	Stop()
}

type dataSaverImpl struct {
	cfg          *db.Config
	log          logger.Logger
	ch           clickhouse.Connector
	users        Users
	sessions     sessions.Sessions
	consumer     types.Consumer
	done         chan struct{}
	conn         driver.Conn
	startTime    int
	endTime      int
	currUser     *UserRecord
	lastTs       time.Time
	eventsOffset int
}

func New(cfg *db.Config, log logger.Logger, ch clickhouse.Connector, sessions sessions.Sessions, users Users, conn driver.Conn) (SdkDataSaver, error) {
	ds := &dataSaverImpl{
		cfg:      cfg,
		log:      log,
		ch:       ch,
		users:    users,
		sessions: sessions,
		done:     make(chan struct{}, 1),
		conn:     conn,
		lastTs:   time.Now(),
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
			if err = json.Unmarshal(data, sdkDataBatch); err != nil {
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
					ds.log.Error(context.Background(), "empty userID for session: %d", sessID)
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
							user.Properties[key] = val
						}
					case model.UserActionSetPropertyOnce:
						for key, val := range action.Payload {
							if _, ok := user.Properties[key]; !ok {
								user.Properties[key] = val
							} else {
								ds.log.Warn(context.Background(), "user property already set: %s", key)
							}
						}
					case model.UserActionIncrementProperty:
						for key, val := range action.Payload {
							intVal, ok := toInt(val)
							if !ok {
								ds.log.Error(context.Background(), "can't convert value to int, key=%s, val=%v", key, val)
								continue
							}
							curr := user.Properties[key]
							intCurr, ok := toInt(curr)
							if !ok {
								ds.log.Error(context.Background(), "can't convert current value to int, key=%s, val=%v", key, curr)
								continue
							}
							user.Properties[key] = intCurr + intVal
						}
					}
					if err = ds.users.Update(user); err != nil {
						ds.log.Error(context.Background(), "can't insert user: %s", err)
					}
				}
			}

			// Events insertion
			for _, event := range sdkDataBatch.Data.Events {
				customEvent := &messages.CustomEvent{
					Name:    event.Name,
					Payload: string(event.Payload),
				}
				customEvent.SetSessionID(sessID)
				customEvent.Timestamp = uint64(event.Timestamp)
				if err = ds.ch.InsertCustom(sessInfo, customEvent); err != nil {
					ds.log.Error(context.Background(), "can't insert custom event: %s", err)
					return
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
		return true
	}
	curMin := now.Hour()*60 + now.Minute()

	if startMin < endMin {
		return curMin >= startMin && curMin < endMin
	}
	return curMin >= startMin || curMin < endMin
}

func toInt(v interface{}) (int, bool) {
	if v == nil {
		return 0, true // consider as an empty value
	}
	switch n := v.(type) {
	case int:
		return n, true
	case int32:
		return int(n), true
	case int64:
		return int(n), true
	case float32:
		return int(n), true
	case float64:
		return int(n), true
	case string:
		i, err := strconv.Atoi(n)
		if err != nil {
			return 0, false
		}
		return i, true
	default:
		return 0, false
	}
}

func (ds *dataSaverImpl) run() {
	updateTimer := time.NewTimer(0)
	defer updateTimer.Stop()

	for {
		select {
		case <-updateTimer.C:
			if inWindow(time.Now(), ds.startTime, ds.endTime) {
				ds.log.Info(context.Background(), "run events updater")
				if err := ds.updateEvents(); err != nil {
					ds.log.Error(context.Background(), "can't update events: %s", err)
				}
			}
			updateTimer.Reset(ds.cfg.PAUpdaterTickDuration)
		case <-ds.done:
			return
		default:
			if err := ds.consumer.ConsumeNext(); err != nil {
				ds.log.Error(context.Background(), "Error on consumption: %v", err)
			}
		}
	}
}

func (ds *dataSaverImpl) updateEvents() error {
	batch, err := clickhouse.NewBulk(ds.conn, nil, "updatedEvents", insertEventsQuery,
		ds.cfg.CHSendBatchSizeLimit+ds.cfg.BatchSizeLimit+1)
	if err != nil {
		return err
	}

	rowsCounter := 0
	for rowsCounter < ds.cfg.CHSendBatchSizeLimit {
		// Use current or load a new user
		if err = ds.loadNewUser(); err != nil {
			ds.log.Error(context.Background(), "[!] can't load new user: %s", err)
			break
		}
		ds.log.Debug(context.Background(), "user record: %+v", ds.currUser)

		// Get user's events to update
		rows := make([]UserEvent, 0, ds.cfg.CHReadBatchSizeLimit)
		if err := ds.conn.Select(context.Background(), &rows, selectEventsQuery,
			ds.currUser.ProjectID, ds.currUser.DistinctID, ds.cfg.CHReadBatchSizeLimit, ds.eventsOffset); err != nil {
			ds.log.Error(context.Background(), "can't select events: %s", err)
			break
		}
		if len(rows) == 0 {
			// No more events for this user
			ds.log.Debug(context.Background(), "no events found for user: %s", ds.currUser.UserID)
			ds.currUser = nil
			continue
		}
		ds.log.Debug(context.Background(), "got %d events to update", len(rows))
		addedNum, err := addUserEvents(batch, rows, ds.currUser)
		ds.eventsOffset += addedNum
		if err != nil {
			ds.log.Error(context.Background(), "can't add events: %s", err)
			break
		}
		rowsCounter += addedNum
		ds.log.Debug(context.Background(), "total events: %d", rowsCounter)
		if len(rows) < ds.cfg.CHReadBatchSizeLimit {
			ds.log.Debug(context.Background(), "got less that asked, selecting the next user")
			ds.currUser = nil
		}
	}
	return batch.Send()
}

func (ds *dataSaverImpl) loadNewUser() error {
	if ds.currUser != nil {
		return nil
	}
	rec := &UserRecord{}
	if err := ds.conn.QueryRow(context.Background(), selectUser, ds.lastTs).ScanStruct(rec); err != nil {
		if strings.Contains(err.Error(), "no rows in result set") {
			ds.resetUser()
		}
		return err
	}
	ds.currUser = rec
	ds.lastTs = rec.Timestamp
	ds.eventsOffset = 0
	return nil
}

func (ds *dataSaverImpl) resetUser() {
	ds.log.Info(context.Background(), "[!] users offset reset")
	ds.currUser = nil
	ds.lastTs = time.Now()
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

var selectUser = `SELECT *
FROM (SELECT project_id, distinct_id, "$user_id", _timestamp
      FROM product_analytics.users_distinct_id
      ORDER BY _timestamp DESC
      LIMIT 1 BY project_id,distinct_id) AS raw
WHERE _timestamp < ?
LIMIT 1;`

var selectEventsQuery = `SELECT *
FROM (SELECT session_id, event_id, "$event_name", created_at, "$time", "$device_id", "$auto_captured", 
       "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", 
       "$duration_s", error_id, issue_type, issue_id, "$properties", properties, "$user_id"
      FROM product_analytics.events
      WHERE project_id = ? AND "$device_id" = ? -- TODO: change the condition in case of overwriting device_id
      ORDER BY _timestamp DESC
      LIMIT 1 BY event_id, "$event_name", created_at, session_id)
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
