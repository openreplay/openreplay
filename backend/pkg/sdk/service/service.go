package service

import (
	"context"
	"encoding/json"
	"strconv"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sdk/model"
	"openreplay/backend/pkg/sessions"
)

type SdkDataSaver interface {
	Stop()
}

type dataSaverImpl struct {
	log      logger.Logger
	ch       clickhouse.Connector
	users    Users
	sessions sessions.Sessions
	consumer types.Consumer
	done     chan struct{}
}

func New(cfg *db.Config, log logger.Logger, ch clickhouse.Connector, sessions sessions.Sessions, users Users) (SdkDataSaver, error) {
	ds := &dataSaverImpl{
		log:      log,
		ch:       ch,
		users:    users,
		sessions: sessions,
		done:     make(chan struct{}, 1),
	}
	var err error
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
					if action.UserID == "" {
						ds.log.Info(context.Background(), "empty userID for session: %d", sessID)
						continue
					}
					if sessInfo.UserID != nil && *sessInfo.UserID == action.UserID {
						ds.log.Info(context.Background(), "got the same userID for session: %d", sessID)
					} else {
						if err = ds.sessions.UpdateUserID(sessID, action.UserID); err != nil {
							ds.log.Error(context.Background(), "can't update userID for session: %d", sessID)
						}
					}
					sessInfo.UserID = &action.UserID
					// Check that we don't have this user already in DB
					_, err := ds.users.Get(sessInfo.ProjectID, action.UserID)
					if err == nil {
						ds.log.Info(context.Background(), "we already have this user in DB for session: %d", sessID)
						if err = ds.users.AddUserDistinctID(sessInfo, model.NewUser(action.UserID)); err != nil {
							ds.log.Error(context.Background(), "can't add user ID to distinct user table: %s", action.UserID)
						}
						continue
					}
					if err = ds.users.Add(sessInfo, model.NewUser(action.UserID)); err != nil {
						ds.log.Error(context.Background(), "can't insert user: %s", err)
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
	for {
		select {
		case <-ds.done:
			return
		default:
			if err := ds.consumer.ConsumeNext(); err != nil {
				ds.log.Error(context.Background(), "Error on consumption: %v", err)
			}
		}
	}
}

func (ds *dataSaverImpl) Stop() {
	ds.done <- struct{}{}
}
