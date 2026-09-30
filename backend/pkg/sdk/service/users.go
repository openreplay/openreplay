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

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/sdk/model"
	"openreplay/backend/pkg/sessions"
)

var ErrUserNotFound = errors.New("user not found")

const (
	pendingTTL      = 10 * time.Minute
	maxDistinctSeen = 300_000
)

type Users interface {
	Add(session *sessions.Session, user *model.User) error
	Get(projectID uint32, userID string) (*model.User, error)
	Create(session *sessions.Session, user *model.User) error
	Update(user *model.User) error
	Delete(projectID uint32, userID string) error
}

type rowSink interface {
	InsertUser(user *model.User) error
	InsertUserTombstone(projectID uint16, userID string) error
	InsertUserDistinctID(projectID uint16, distinctID, userID string) error
	AfterSend(hook func(flushedAt time.Time))
}

type pendingUser struct {
	user   *model.User
	at     time.Time
	readTs time.Time
	sentAt time.Time
}

type usersImpl struct {
	log      logger.Logger
	conn     driver.Conn
	sink     rowSink
	sessions sessions.Sessions
	metrics  database.Database

	mu           sync.Mutex
	pending      map[string]*pendingUser
	distinctSeen map[string]bool
}

func NewUsers(log logger.Logger, conn driver.Conn, sink rowSink, sessions sessions.Sessions, metrics database.Database) (Users, error) {
	u := &usersImpl{
		log:          log,
		conn:         conn,
		sink:         sink,
		sessions:     sessions,
		metrics:      metrics,
		pending:      make(map[string]*pendingUser),
		distinctSeen: make(map[string]bool),
	}
	sink.AfterSend(u.markSent)
	go u.sweeper()
	return u, nil
}

func (u *usersImpl) markSent(flushedAt time.Time) {
	now := time.Now()
	u.mu.Lock()
	for _, p := range u.pending {
		if p.sentAt.IsZero() && !p.at.After(flushedAt) {
			p.sentAt = now
		}
	}
	u.mu.Unlock()
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

func sameUser(a, b *model.User) bool {
	return a.Email == b.Email && a.Name == b.Name && a.FirstName == b.FirstName && a.LastName == b.LastName &&
		a.Phone == b.Phone && a.Avatar == b.Avatar && a.PropertiesString() == b.PropertiesString() &&
		a.LastSeen.Unix() == b.LastSeen.Unix() &&
		strings.Join(a.GroupID1, ",") == strings.Join(b.GroupID1, ",") &&
		strings.Join(a.GroupID2, ",") == strings.Join(b.GroupID2, ",") &&
		strings.Join(a.GroupID3, ",") == strings.Join(b.GroupID3, ",") &&
		strings.Join(a.GroupID4, ",") == strings.Join(b.GroupID4, ",") &&
		strings.Join(a.GroupID5, ",") == strings.Join(b.GroupID5, ",") &&
		strings.Join(a.GroupID6, ",") == strings.Join(b.GroupID6, ",")
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

// A pending row older than pendingReadback is checked against ClickHouse: a newer, different row there wins.
func (u *usersImpl) current(projectID uint32, userID string) (*model.User, error) {
	key := userKey(projectID, userID)
	u.mu.Lock()
	p := u.pending[key]
	u.mu.Unlock()
	if p != nil && p.sentAt.IsZero() {
		return cloneUser(p.user), nil
	}
	user, err := u.fetch(projectID, userID)
	if p == nil {
		return user, err
	}
	if err != nil {
		return cloneUser(p.user), nil
	}
	u.mu.Lock()
	delete(u.pending, key)
	u.mu.Unlock()
	if user.Timestamp.After(p.readTs) && !user.Timestamp.After(p.sentAt.Add(time.Second)) && !sameUser(user, p.user) {
		u.metrics.IncreaseUserConflicts()
		u.log.Warn(context.Background(), "user %s in project %d was changed by another writer between our read and our write", userID, projectID)
	}
	return user, nil
}

func (u *usersImpl) write(user *model.User) error {
	key := userKey(uint32(user.ProjectID), user.UserID)
	u.mu.Lock()
	readTs := user.Timestamp
	if p := u.pending[key]; p != nil && p.readTs.After(readTs) {
		readTs = p.readTs
	}
	u.pending[key] = &pendingUser{user: cloneUser(user), at: time.Now(), readTs: readTs}
	u.mu.Unlock()
	return u.sink.InsertUser(user)
}

func (u *usersImpl) markDistinct(dk string) bool {
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.distinctSeen[dk] {
		return false
	}
	if len(u.distinctSeen) >= maxDistinctSeen {
		u.distinctSeen = make(map[string]bool)
	}
	u.distinctSeen[dk] = true
	return true
}

func (u *usersImpl) sweep(now time.Time) {
	u.mu.Lock()
	for k, p := range u.pending {
		if now.Sub(p.at) > pendingTTL {
			delete(u.pending, k)
		}
	}
	u.mu.Unlock()
}

func (u *usersImpl) sweeper() {
	for now := range time.Tick(time.Minute) {
		u.sweep(now)
	}
}

func (u *usersImpl) Add(session *sessions.Session, user *model.User) error {
	user.UserID = strings.TrimSpace(user.UserID)
	if user.UserID == "" {
		u.log.Debug(context.Background(), "add user with empty userID, session: %d", session.SessionID)
		return nil
	}
	if session.UserID != nil && *session.UserID == user.UserID {
		u.log.Debug(context.Background(), "user %s already exists", user.UserID)
		return nil
	}
	if err := u.sessions.UpdateUserID(session.SessionID, user.UserID); err != nil {
		u.log.Error(context.Background(), "can't update userID for session: %d", session.SessionID)
	}
	session.UserID = &user.UserID

	dk := distinctKey(session.ProjectID, session.UserUUID, user.UserID)
	currUser, err := u.current(session.ProjectID, user.UserID)
	if err != nil && !errors.Is(err, ErrUserNotFound) {
		u.log.Error(context.Background(), "can't get user: %s", err)
	}
	if currUser == nil {
		return u.create(session, user)
	}
	if u.markDistinct(dk) {
		if err := u.sink.InsertUserDistinctID(uint16(session.ProjectID), session.UserUUID, user.UserID); err != nil {
			u.log.Error(context.Background(), "can't add user ID to distinct user table: %s", user.UserID)
		}
	}
	currUser.LastSeen = time.Now()
	return u.write(currUser)
}

func (u *usersImpl) create(session *sessions.Session, user *model.User) error {
	u.log.Debug(context.Background(), "sess: %d,user to insert: %+v", session.SessionID, user)
	started := time.UnixMilli(int64(session.Timestamp))
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
	if user.Properties == nil {
		user.Properties = make(map[string]interface{})
	}
	if err := u.write(user); err != nil {
		return fmt.Errorf("can't insert user to users table: %s", err)
	}
	if err := u.sink.InsertUserDistinctID(uint16(session.ProjectID), session.UserUUID, user.UserID); err != nil {
		return fmt.Errorf("can't insert user to users_distinct_id table: %s", err)
	}
	u.markDistinct(distinctKey(session.ProjectID, session.UserUUID, user.UserID))
	return nil
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func (u *usersImpl) Get(projectID uint32, userID string) (*model.User, error) {
	return u.current(projectID, userID)
}

func (u *usersImpl) Create(session *sessions.Session, user *model.User) error {
	user.UserID = strings.TrimSpace(user.UserID)
	if user.UserID == "" {
		u.log.Debug(context.Background(), "create user with empty userID, session: %d", session.SessionID)
		return nil
	}
	if session.UserID == nil || *session.UserID != user.UserID {
		if err := u.sessions.UpdateUserID(session.SessionID, user.UserID); err != nil {
			u.log.Error(context.Background(), "can't update userID for session: %d", session.SessionID)
		}
		session.UserID = &user.UserID
	}
	return u.create(session, user)
}

func (u *usersImpl) Update(user *model.User) error {
	u.log.Debug(context.Background(), "user to update: %+v", user)
	return u.write(user)
}

func (u *usersImpl) Delete(projectID uint32, userID string) error {
	u.mu.Lock()
	delete(u.pending, userKey(projectID, userID))
	u.mu.Unlock()
	return u.sink.InsertUserTombstone(uint16(projectID), userID)
}
