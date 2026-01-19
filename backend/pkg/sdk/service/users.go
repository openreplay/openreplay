package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	rds "github.com/redis/go-redis/v9"

	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/sdk/model"
	"openreplay/backend/pkg/sessions"
)

type Users interface {
	Add(session *sessions.Session, user *model.User) error
	Get(projectID uint32, userID string) (*model.User, error)
	GetUserIDByDistinctID(projectID uint32, distinctID string) (string, error)
	Update(user *model.User) error
	Delete(projectID uint32, userID string) error
	Commit() error
}

type usersImpl struct {
	log              logger.Logger
	conn             driver.Conn
	sessions         sessions.Sessions
	redis            *redis.Client
	mutex            *sync.RWMutex
	distinctIdsBatch map[uint32]map[string]string
}

func NewUsers(log logger.Logger, conn driver.Conn, sessions sessions.Sessions, redis *redis.Client) (Users, error) {
	return &usersImpl{
		log:              log,
		conn:             conn,
		sessions:         sessions,
		redis:            redis,
		mutex:            &sync.RWMutex{},
		distinctIdsBatch: make(map[uint32]map[string]string),
	}, nil
}

var (
	insertQuery = `INSERT INTO product_analytics.users (project_id, "$user_id", "$email", "$name", "$first_name", "$last_name", "$phone", "$avatar", properties, group_id1, group_id2, group_id3, group_id4, group_id5, group_id6, "$sdk_edition", "$sdk_version", "$current_url", "$initial_referrer", "$referring_domain", initial_utm_source, initial_utm_medium, initial_utm_campaign, "$country", "$state", "$city", "$or_api_endpoint", "$created_at", "$first_event_at", "$last_seen") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	selectQuery = `SELECT project_id, "$user_id", "$email", "$name", "$first_name", "$last_name", "$phone", "$avatar", properties, group_id1, group_id2, group_id3, group_id4, group_id5, group_id6, "$sdk_edition", "$sdk_version", "$current_url", "$initial_referrer", "$referring_domain", initial_utm_source, initial_utm_medium, initial_utm_campaign, "$country", "$state", "$city", "$or_api_endpoint", "$first_event_at" from product_analytics.users WHERE project_id = ? AND "$user_id" = ? LIMIT 1`
)

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

	// Check that we don't have this user already in DB
	if currUser, err := u.Get(session.ProjectID, user.UserID); err == nil {
		u.log.Debug(context.Background(), "we already have this user in DB for session: %d", session.SessionID)
		if err = u.addUserDistinctID(session, user); err != nil {
			u.log.Error(context.Background(), "can't add user ID to distinct user table: %s", user.UserID)
		}
		currUser.LastSeen = time.Now()
		if err = u.Update(currUser); err != nil {
			u.log.Error(context.Background(), "can't update user: %s", err.Error())
		}
		return nil
	}
	if err := u.add(session, user); err != nil {
		return fmt.Errorf("can't insert user: %s", err)
	}
	return nil
}

func (u *usersImpl) add(session *sessions.Session, user *model.User) error {
	u.log.Info(context.Background(), "sess: %d,user to insert: %+v", session.SessionID, user)
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
	if err := u.addUserToCache(session.ProjectID, user); err != nil {
		u.log.Warn(context.Background(), "can't add user ID to cache table: %s", user.UserID)
	}
	return u.addUserDistinctID(session, user)
}

var usersCacheString = "user:%d:%s"

func (u *usersImpl) addUserToCache(projectID uint32, user *model.User) error {
	if u.redis == nil {
		return errors.New("redis client not initialized")
	}
	userBytes, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("can't marshal user to string: %s", err)
	}
	if _, err := u.redis.Redis.Set(context.Background(), fmt.Sprintf(usersCacheString, projectID, user.UserID), userBytes, time.Hour).Result(); err != nil {
		return err
	}
	return nil
}

func (u *usersImpl) getUserFromCache(projectID uint32, userID string) (*model.User, error) {
	if u.redis == nil {
		return nil, errors.New("redis client not initialized")
	}
	userBytes, err := u.redis.Redis.Get(context.Background(), fmt.Sprintf(usersCacheString, projectID, userID)).Result()
	if err != nil {
		return nil, err
	}
	user := &model.User{}
	if err := json.Unmarshal([]byte(userBytes), user); err != nil {
		return nil, fmt.Errorf("can't unmarshal user from cache: %s", err)
	}
	return user, nil
}

func (u *usersImpl) Get(projectID uint32, userID string) (*model.User, error) {
	if user, err := u.getUserFromCache(projectID, userID); err != nil {
		if !errors.Is(err, rds.Nil) {
			u.log.Warn(context.Background(), "can't get user from cache: %s", err)
		}
	} else {
		return user, nil
	}
	user := &model.User{}
	if err := u.conn.QueryRow(context.Background(), selectQuery, projectID, userID).ScanStruct(user); err != nil {
		return nil, fmt.Errorf("can't get user from database: %s", err)
	}
	if err := u.addUserToCache(projectID, user); err != nil {
		u.log.Warn(context.Background(), "can't add user to cache: %s", userID)
	}
	return user, nil
}

var usersDistinctCacheString = "user-distinct:%d:%s"

func (u *usersImpl) addUserDistinctID(session *sessions.Session, user *model.User) error {
	u.mutex.Lock()
	if _, ok := u.distinctIdsBatch[session.ProjectID]; !ok {
		u.distinctIdsBatch[session.ProjectID] = make(map[string]string)
	}
	u.distinctIdsBatch[session.ProjectID][session.UserUUID] = user.UserID
	u.mutex.Unlock()

	if u.redis == nil {
		return nil
	}
	if _, err := u.redis.Redis.Set(context.Background(), fmt.Sprintf(usersDistinctCacheString, session.ProjectID, session.UserUUID), user.UserID, time.Hour).Result(); err != nil {
		return fmt.Errorf("can't add user ID to distinct cache: %s", err)
	}
	return nil
}

func (u *usersImpl) GetUserIDByDistinctID(projectID uint32, distinctID string) (string, error) {
	if u.redis != nil {
		if userID, err := u.redis.Redis.Get(context.Background(), fmt.Sprintf(usersDistinctCacheString, projectID, distinctID)).Result(); err != nil {
			if !errors.Is(err, rds.Nil) {
				u.log.Warn(context.Background(), "can't get user from cache: %s", err)
			}
		} else {
			return userID, nil
		}
	}
	query := `SELECT "$user_id" FROM product_analytics.users_distinct_id WHERE project_id = ? AND distinct_id = ? ORDER BY _timestamp DESC LIMIT 1`
	var userID string
	if err := u.conn.QueryRow(context.Background(), query, projectID, distinctID).Scan(&userID); err != nil {
		return "", fmt.Errorf("can't get user from database: %s", err)
	}
	if u.redis == nil {
		return userID, nil
	}
	if _, err := u.redis.Redis.Set(context.Background(), fmt.Sprintf(usersDistinctCacheString, projectID, distinctID), userID, time.Hour).Result(); err != nil {
		u.log.Warn(context.Background(), "can't add user ID to cache: %s", distinctID)
	}
	return userID, nil
}

func (u *usersImpl) Update(user *model.User) error {
	u.log.Info(context.Background(), "user to update: %+v", user)
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
	if err := u.addUserToCache(uint32(user.ProjectID), user); err != nil {
		u.log.Warn(context.Background(), "can't add user to cache: %s", user.UserID)
	}
	return nil
}

func (u *usersImpl) Delete(projectID uint32, userID string) error {
	query := `INSERT INTO product_analytics.users (project_id, "$user_id", _deleted_at) VALUES (?, ?, ?)`
	return u.conn.Exec(context.Background(), query, projectID, userID, time.Now())
}

func (u *usersImpl) Commit() error {
	u.mutex.Lock()
	defer u.mutex.Unlock()

	if len(u.distinctIdsBatch) == 0 {
		u.log.Debug(context.Background(), "no user-distinct-ids to commit")
		return nil
	}

	insertSql := `INSERT INTO product_analytics.users_distinct_id (project_id, distinct_id, "$user_id") VALUES (?, ?, ?)`

	batch, err := u.conn.PrepareBatch(context.Background(), insertSql)
	if err != nil {
		return fmt.Errorf("can't create new batch: %s", err)
	}
	count := 0
	for projID, users := range u.distinctIdsBatch {
		for distinctID, userID := range users {
			if err := batch.Append(projID, distinctID, userID); err != nil {
				u.log.Warn(context.Background(), "can't append to batch: %s", err)
			}
			count++
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("can't commit batch: %s", err)
	}
	u.distinctIdsBatch = make(map[uint32]map[string]string)
	return nil
}
