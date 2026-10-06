package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/sdk/model"
	"openreplay/backend/pkg/sessions"
)

var ErrUserNotFound = errors.New("user not found")

const (
	maxDistinctSeen = 300_000
	maxStoreRetries = 10
)

type Users interface {
	Add(session *sessions.Session, userID string) error
	Set(session *sessions.Session, userID string, props map[string]interface{}) error
	SetOnce(session *sessions.Session, userID string, props map[string]interface{}) error
	Increment(session *sessions.Session, userID string, props map[string]interface{}) error
	Delete(projectID uint32, userID string) error
}

type rowSink interface {
	InsertUser(user *model.User) error
	InsertUserTombstone(projectID uint16, userID string) error
	InsertUserDistinctID(projectID uint16, distinctID, userID string) error
	SetRowRefresher(table string, refresh func(rows [][]interface{}) [][]interface{})
}

type userState interface {
	load(key string) (*model.User, uint64, bool, error)
	loadMany(keys []string) (map[string]*model.User, error)
	create(key string, user *model.User) (bool, error)
	store(key string, user *model.User, version uint64) (bool, error)
	delete(key string) error
}

type usersImpl struct {
	log      logger.Logger
	conn     driver.Conn
	sink     rowSink
	sessions sessions.Sessions
	metrics  database.Database
	state    userState
	memory   *memoryState

	mu           sync.Mutex
	distinctSeen map[string]bool
}

func NewUsers(log logger.Logger, conn driver.Conn, sink rowSink, sessions sessions.Sessions, metrics database.Database, client *redis.Client, stateTTL time.Duration) (Users, error) {
	u := &usersImpl{
		log:          log,
		conn:         conn,
		sink:         sink,
		sessions:     sessions,
		metrics:      metrics,
		memory:       newMemoryState(),
		distinctSeen: make(map[string]bool),
	}
	u.state = u.memory
	if st := newRedisState(client, stateTTL); st != nil {
		u.state = st
	}
	sink.SetRowRefresher("pa_users", u.refresh)
	go u.memory.sweeper()
	return u, nil
}

var selectQuery = `SELECT project_id, "$user_id", "$email", "$name", "$first_name", "$last_name", "$phone", "$avatar", properties, group_id1, group_id2, group_id3, group_id4, group_id5, group_id6, "$sdk_edition", "$sdk_version", "$current_url", "$initial_referrer", "$referring_domain", initial_utm_source, initial_utm_medium, initial_utm_campaign, "$country", "$state", "$city", "$or_api_endpoint", "$created_at", "$first_event_at", "$last_seen", _is_deleted AS _deleted, _timestamp from product_analytics.users WHERE project_id = ? AND "$user_id" = ? ORDER BY _timestamp DESC LIMIT 1`

func userKey(projectID uint32, userID string) string {
	return strconv.FormatUint(uint64(projectID), 10) + "|" + userID
}

func distinctKey(projectID uint32, distinctID, userID string) string {
	return strconv.FormatUint(uint64(projectID), 10) + "|" + distinctID + "|" + userID
}

func cloneUser(u *model.User) *model.User {
	c := *u
	if u.Properties != nil {
		c.Properties = make(map[string]interface{}, len(u.Properties))
		for k, v := range u.Properties {
			c.Properties[k] = v
		}
	}
	c.GroupID1 = append([]string(nil), u.GroupID1...)
	c.GroupID2 = append([]string(nil), u.GroupID2...)
	c.GroupID3 = append([]string(nil), u.GroupID3...)
	c.GroupID4 = append([]string(nil), u.GroupID4...)
	c.GroupID5 = append([]string(nil), u.GroupID5...)
	c.GroupID6 = append([]string(nil), u.GroupID6...)
	return &c
}

func (u *usersImpl) fetch(projectID uint32, userID string) (*model.User, error) {
	user := &model.User{}
	if err := u.conn.QueryRow(context.Background(), selectQuery, projectID, userID).ScanStruct(user); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("can't get user from database: %s", err)
	}
	if user.Deleted != 0 {
		return nil, ErrUserNotFound
	}
	if user.Properties == nil {
		user.Properties = make(map[string]interface{})
	}
	return user, nil
}

func newUserFromSession(session *sessions.Session, userID string) *model.User {
	started := time.UnixMilli(int64(session.Timestamp))
	user := model.NewUser(userID)
	user.ProjectID = uint16(session.ProjectID)
	user.SdkEdition = "tracker"
	user.SdkVersion = session.TrackerVersion
	user.InitialRef = deref(session.Referrer)
	user.UtmSource = deref(session.UtmSource)
	user.UtmMedium = deref(session.UtmMedium)
	user.UtmCampaign = deref(session.UtmCampaign)
	user.Country = session.UserCountry
	user.State = session.UserState
	user.City = session.UserCity
	user.CreatedAt = started
	user.FirstEventAt = started
	user.LastSeen = started
	return user
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func (u *usersImpl) mutate(session *sessions.Session, userID string, fn func(user *model.User, isNew bool)) (*model.User, error) {
	key := userKey(session.ProjectID, userID)
	st := u.state
	for attempt := 0; attempt < maxStoreRetries; attempt++ {
		user, version, found, err := st.load(key)
		if err != nil {
			st = u.degrade(key, err)
			continue
		}
		isNew := false
		switch {
		case found && user.Deleted != 0:
			// user is pending deletion; start fresh so a stale database row is not resurrected
			user = newUserFromSession(session, userID)
			isNew = true
		case !found:
			user, err = u.fetch(session.ProjectID, userID)
			if err != nil && !errors.Is(err, ErrUserNotFound) {
				return nil, err
			}
			if user == nil {
				user = newUserFromSession(session, userID)
				isNew = true
			}
			created, err := st.create(key, user)
			if err != nil {
				st = u.degrade(key, err)
				continue
			}
			if !created {
				continue
			}
			version = 0
		}
		fn(user, isNew)
		stored, err := st.store(key, user, version)
		if err != nil {
			st = u.degrade(key, err)
			continue
		}
		if !stored {
			u.metrics.IncreaseUserConflicts()
			continue
		}
		return user, u.sink.InsertUser(user)
	}
	return nil, fmt.Errorf("can't store user %s after %d attempts", userID, maxStoreRetries)
}

func (u *usersImpl) degrade(key string, err error) userState {
	u.log.Warn(context.Background(), "user state unavailable for %s, using process memory: %s", key, err)
	u.metrics.IncreaseUserStateFallbacks()
	return u.memory
}

func (u *usersImpl) bindDevice(session *sessions.Session, userID string) {
	dk := distinctKey(session.ProjectID, session.UserUUID, userID)
	u.mu.Lock()
	seen := u.distinctSeen[dk]
	if !seen {
		if len(u.distinctSeen) >= maxDistinctSeen {
			u.distinctSeen = make(map[string]bool)
		}
		u.distinctSeen[dk] = true
	}
	u.mu.Unlock()
	if seen {
		return
	}
	if err := u.sink.InsertUserDistinctID(uint16(session.ProjectID), session.UserUUID, userID); err != nil {
		u.log.Error(context.Background(), "can't add user ID to distinct user table: %s", userID)
	}
}

func (u *usersImpl) Add(session *sessions.Session, userID string) error {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		u.log.Debug(context.Background(), "add user with empty userID, session: %d", session.SessionID)
		return nil
	}
	if session.UserID != nil && *session.UserID == userID {
		u.log.Debug(context.Background(), "user %s already exists", userID)
		return nil
	}
	if err := u.sessions.UpdateUserID(session.SessionID, userID); err != nil {
		u.log.Error(context.Background(), "can't update userID for session: %d", session.SessionID)
	}
	session.UserID = &userID
	if _, err := u.mutate(session, userID, func(user *model.User, isNew bool) {
		if !isNew {
			user.LastSeen = time.Now()
		}
	}); err != nil {
		return err
	}
	u.bindDevice(session, userID)
	return nil
}

func (u *usersImpl) Set(session *sessions.Session, userID string, props map[string]interface{}) error {
	_, err := u.mutate(session, userID, func(user *model.User, _ bool) {
		for k, v := range props {
			user.SetProperty(k, v)
		}
	})
	return err
}

func (u *usersImpl) SetOnce(session *sessions.Session, userID string, props map[string]interface{}) error {
	_, err := u.mutate(session, userID, func(user *model.User, _ bool) {
		for k, v := range props {
			user.SetPropertyOnce(k, v)
		}
	})
	return err
}

func (u *usersImpl) Increment(session *sessions.Session, userID string, props map[string]interface{}) error {
	_, err := u.mutate(session, userID, func(user *model.User, _ bool) {
		for k, v := range props {
			user.IncrementProperty(k, v)
		}
	})
	return err
}

func deletedMarker(projectID uint32, userID string) *model.User {
	return &model.User{
		ProjectID:  uint16(projectID),
		UserID:     userID,
		Deleted:    1,
		Properties: map[string]interface{}{},
	}
}

func (u *usersImpl) Delete(projectID uint32, userID string) error {
	key := userKey(projectID, userID)
	st := u.state
	for attempt := 0; attempt < maxStoreRetries; attempt++ {
		_, version, found, err := st.load(key)
		if err != nil {
			st = u.degrade(key, err)
			continue
		}
		marker := deletedMarker(projectID, userID)
		var ok bool
		if found {
			ok, err = st.store(key, marker, version)
		} else {
			ok, err = st.create(key, marker)
		}
		if err != nil {
			st = u.degrade(key, err)
			continue
		}
		if !ok {
			continue
		}
		return u.sink.InsertUserTombstone(uint16(projectID), userID)
	}
	return fmt.Errorf("can't mark user %s deleted after %d attempts", userID, maxStoreRetries)
}

func (u *usersImpl) refresh(rows [][]interface{}) [][]interface{} {
	keys := make([]string, 0, len(rows))
	for _, row := range rows {
		if row[len(row)-1] == uint8(1) {
			continue
		}
		keys = append(keys, userKey(uint32(row[0].(uint16)), row[1].(string)))
	}
	latest, err := u.state.loadMany(keys)
	if err != nil {
		u.log.Warn(context.Background(), "can't refresh users batch from state: %s", err)
		return rows
	}
	for i, row := range rows {
		if row[len(row)-1] == uint8(1) {
			continue
		}
		if user, ok := latest[userKey(uint32(row[0].(uint16)), row[1].(string))]; ok {
			rows[i] = clickhouse.UserRow(user)
		}
	}
	return rows
}
