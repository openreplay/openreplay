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
	"openreplay/backend/pkg/sdk/model"
	"openreplay/backend/pkg/sessions"
)

var ErrUserNotFound = errors.New("user not found")

const (
	lastSeenThrottle = time.Minute
	maxCachedUsers   = 200_000
	maxDistinctSeen  = 300_000
)

type Users interface {
	Add(session *sessions.Session, user *model.User) error
	Get(projectID uint32, userID string) (*model.User, error)
	Create(session *sessions.Session, user *model.User) error
	Update(user *model.User) error
	Delete(projectID uint32, userID string) error
}

type usersImpl struct {
	log      logger.Logger
	conn     driver.Conn
	sessions sessions.Sessions

	mu           sync.Mutex
	cache        map[string]*model.User // key -> latest known state (write-through)
	distinctSeen map[string]bool        // projectID|distinctID|userID already inserted
	lastTouch    map[string]time.Time   // key -> last last_seen write
}

func NewUsers(log logger.Logger, conn driver.Conn, sessions sessions.Sessions) (Users, error) {
	return &usersImpl{
		log:          log,
		conn:         conn,
		sessions:     sessions,
		cache:        make(map[string]*model.User),
		distinctSeen: make(map[string]bool),
		lastTouch:    make(map[string]time.Time),
	}, nil
}

var (
	insertQuery = `INSERT INTO product_analytics.users (project_id, "$user_id", "$email", "$name", "$first_name", "$last_name", "$phone", "$avatar", properties, group_id1, group_id2, group_id3, group_id4, group_id5, group_id6, "$sdk_edition", "$sdk_version", "$current_url", "$initial_referrer", "$referring_domain", initial_utm_source, initial_utm_medium, initial_utm_campaign, "$country", "$state", "$city", "$or_api_endpoint", "$created_at", "$first_event_at", "$last_seen") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	selectQuery = `SELECT project_id, "$user_id", "$email", "$name", "$first_name", "$last_name", "$phone", "$avatar", properties, group_id1, group_id2, group_id3, group_id4, group_id5, group_id6, "$sdk_edition", "$sdk_version", "$current_url", "$initial_referrer", "$referring_domain", initial_utm_source, initial_utm_medium, initial_utm_campaign, "$country", "$state", "$city", "$or_api_endpoint", "$created_at", "$first_event_at", "$last_seen", _deleted_at != '1970-01-01 00:00:00' AS _deleted from product_analytics.users WHERE project_id = ? AND "$user_id" = ? ORDER BY _timestamp DESC LIMIT 1`
)

func userKey(projectID uint32, userID string) string {
	return strconv.FormatUint(uint64(projectID), 10) + "|" + userID
}

func distinctKey(projectID uint32, distinctID, userID string) string {
	return strconv.FormatUint(uint64(projectID), 10) + "|" + distinctID + "|" + userID
}

func cloneUser(u *model.User) *model.User {
	if u == nil {
		return nil
	}
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

func (u *usersImpl) getCached(key string) *model.User {
	u.mu.Lock()
	defer u.mu.Unlock()
	return cloneUser(u.cache[key])
}

func (u *usersImpl) store(key string, user *model.User) {
	u.mu.Lock()
	defer u.mu.Unlock()
	if len(u.cache) >= maxCachedUsers {
		u.cache = make(map[string]*model.User)
		u.distinctSeen = make(map[string]bool)
		u.lastTouch = make(map[string]time.Time)
	}
	u.cache[key] = cloneUser(user)
}

func (u *usersImpl) evict(key string) {
	u.mu.Lock()
	defer u.mu.Unlock()
	delete(u.cache, key)
	delete(u.lastTouch, key)
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

func (u *usersImpl) shouldTouch(key string) bool {
	u.mu.Lock()
	defer u.mu.Unlock()
	now := time.Now()
	if last, ok := u.lastTouch[key]; ok && now.Sub(last) < lastSeenThrottle {
		return false
	}
	u.lastTouch[key] = now
	return true
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

	key := userKey(session.ProjectID, user.UserID)
	dk := distinctKey(session.ProjectID, session.UserUUID, user.UserID)

	currUser := u.getCached(key)
	if currUser == nil {
		var err error
		currUser, err = u.Get(session.ProjectID, user.UserID)
		if err != nil && !errors.Is(err, ErrUserNotFound) {
			u.log.Error(context.Background(), "can't get user: %s", err)
		}
	}
	if currUser != nil {
		if u.markDistinct(dk) {
			if err := u.addUserDistinctID(session, user); err != nil {
				u.log.Error(context.Background(), "can't add user ID to distinct user table: %s", user.UserID)
			}
		}
		if u.shouldTouch(key) {
			currUser.LastSeen = time.Now()
			if err := u.Update(currUser); err != nil {
				u.log.Error(context.Background(), "can't update user: %s", err.Error())
			}
		}
		return nil
	}
	if err := u.add(session, user); err != nil {
		return fmt.Errorf("can't insert user: %s", err)
	}
	u.markDistinct(dk)
	return nil
}

func (u *usersImpl) add(session *sessions.Session, user *model.User) error {
	u.log.Debug(context.Background(), "sess: %d,user to insert: %+v", session.SessionID, user)
	if err := u.conn.Exec(context.Background(), insertQuery,
		session.ProjectID,
		user.UserID,
		user.Email,              // $email
		user.Name,               // $name
		user.FirstName,          // $first_name
		user.LastName,           // $last_name
		user.Phone,              // $phone
		user.Avatar,             // $avatar
		user.PropertiesString(), // properties
		user.GroupID1,           // group_id1
		user.GroupID2,           // group_id2
		user.GroupID3,           // group_id3
		user.GroupID4,           // group_id4
		user.GroupID5,           // group_id5
		user.GroupID6,           // group_id6
		"tracker",               // $sdk_edition
		session.TrackerVersion,  // $sdk_version
		nil,                     // $current_url
		session.Referrer,        // $initial_referrer
		nil,                     // $referring_domain
		session.UtmSource,       // initial_utm_source
		session.UtmMedium,       // initial_utm_medium
		session.UtmCampaign,     // initial_utm_campaign
		session.UserCountry,     // $country
		session.UserState,       // $state
		session.UserCity,        // $city
		nil,                     // $or_api_endpoint
		session.Timestamp/1000,  // created_at
		session.Timestamp/1000,  // $first_event_at
		session.Timestamp/1000,  // $last_seen
	); err != nil {
		return fmt.Errorf("can't insert user to users table: %s", err)
	}
	query := `INSERT INTO product_analytics.users_distinct_id (project_id, distinct_id, "$user_id") VALUES (?, ?, ?)`
	if err := u.conn.Exec(context.Background(), query, session.ProjectID, session.UserUUID, user.UserID); err != nil {
		return fmt.Errorf("can't insert user to users_distinct_id table: %s", err)
	}
	u.store(userKey(session.ProjectID, user.UserID), user)
	return nil
}

func (u *usersImpl) addUserDistinctID(session *sessions.Session, user *model.User) error {
	query := `INSERT INTO product_analytics.users_distinct_id (project_id, distinct_id, "$user_id") VALUES (?, ?, ?)`
	if err := u.conn.Exec(context.Background(), query, session.ProjectID, session.UserUUID, user.UserID); err != nil {
		return fmt.Errorf("can't insert user to users_distinct_id table: %s", err)
	}
	return nil
}

func (u *usersImpl) Get(projectID uint32, userID string) (*model.User, error) {
	if cached := u.getCached(userKey(projectID, userID)); cached != nil {
		return cached, nil
	}
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
	u.store(userKey(projectID, userID), user)
	return user, nil
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
	return u.add(session, user)
}

func (u *usersImpl) Update(user *model.User) error {
	u.log.Debug(context.Background(), "user to update: %+v", user)
	if err := u.conn.Exec(context.Background(), insertQuery,
		user.ProjectID,
		user.UserID,
		user.Email,              // $email
		user.Name,               // $name
		user.FirstName,          // $first_name
		user.LastName,           // $last_name
		user.Phone,              // $phone
		user.Avatar,             // $avatar
		user.PropertiesString(), // properties
		user.GroupID1,           // group_id1
		user.GroupID2,           // group_id2
		user.GroupID3,           // group_id3
		user.GroupID4,           // group_id4
		user.GroupID5,           // group_id5
		user.GroupID6,           // group_id6
		user.SdkEdition,         // $sdk_edition
		user.SdkVersion,         // $sdk_version
		user.CurrentUrl,         // $current_url
		user.InitialRef,         // $initial_referrer
		user.RefDomain,          // $referring_domain
		user.UtmSource,          // initial_utm_source
		user.UtmMedium,          // initial_utm_medium
		user.UtmCampaign,        // initial_utm_campaign
		user.Country,            // $country
		user.State,              // $state
		user.City,               // $city
		user.OrApiEndpoint,      // $or_api_endpoint
		user.CreatedAt,
		user.FirstEventAt,
		user.LastSeen,
	); err != nil {
		return fmt.Errorf("can't insert user to users table: %s", err)
	}
	u.store(userKey(uint32(user.ProjectID), user.UserID), user)
	return nil
}

func (u *usersImpl) Delete(projectID uint32, userID string) error {
	query := `INSERT INTO product_analytics.users (project_id, "$user_id", _deleted_at) VALUES (?, ?, ?)`
	if err := u.conn.Exec(context.Background(), query, projectID, userID, time.Now()); err != nil {
		return err
	}
	u.evict(userKey(projectID, userID))
	return nil
}
