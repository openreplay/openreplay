package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/sdk/model"
	"openreplay/backend/pkg/sessions"
)

type Users interface {
	Add(session *sessions.Session, user *model.User) error
	Get(projectID uint32, userID string) (*model.User, error)
	Update(user *model.User) error
	Delete(projectID uint32, userID string) error
}

type usersImpl struct {
	log      logger.Logger
	conn     driver.Conn
	sessions sessions.Sessions
}

func NewUsers(log logger.Logger, conn driver.Conn, sessions sessions.Sessions) (Users, error) {
	return &usersImpl{
		log:      log,
		conn:     conn,
		sessions: sessions,
	}, nil
}

var (
	insertQuery = `INSERT INTO product_analytics.users (project_id, "$user_id", "$email", "$name", "$first_name", "$last_name", "$phone", "$avatar", properties, group_id1, group_id2, group_id3, group_id4, group_id5, group_id6, "$sdk_edition", "$sdk_version", "$current_url", "$initial_referrer", "$referring_domain", initial_utm_source, initial_utm_medium, initial_utm_campaign, "$country", "$state", "$city", "$or_api_endpoint", "$first_event_at") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	selectQuery = `SELECT project_id, "$user_id", "$email", "$name", "$first_name", "$last_name", "$phone", "$avatar", properties, group_id1, group_id2, group_id3, group_id4, group_id5, group_id6, "$sdk_edition", "$sdk_version", "$current_url", "$initial_referrer", "$referring_domain", initial_utm_source, initial_utm_medium, initial_utm_campaign, "$country", "$state", "$city", "$or_api_endpoint", "$first_event_at" from product_analytics.users WHERE project_id = ? AND "$user_id" = ? LIMIT 1`
)

func (u *usersImpl) Add(session *sessions.Session, user *model.User) error {
	user.UserID = strings.TrimSpace(user.UserID)
	if user.UserID == "" {
		return fmt.Errorf("empty userID for session: %d", session.SessionID)
	}
	if session.UserID != nil && *session.UserID == user.UserID {
		return fmt.Errorf("got the same userID for session: %d", session.SessionID)
	}
	if err := u.sessions.UpdateUserID(session.SessionID, user.UserID); err != nil {
		u.log.Error(context.Background(), "can't update userID for session: %d", session.SessionID)
	}
	session.UserID = &user.UserID

	// Check that we don't have this user already in DB
	if _, err := u.Get(session.ProjectID, user.UserID); err == nil {
		u.log.Info(context.Background(), "we already have this user in DB for session: %d", session.SessionID)
		if err = u.addUserDistinctID(session, user); err != nil {
			u.log.Error(context.Background(), "can't add user ID to distinct user table: %s", user.UserID)
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
		session.Timestamp/1000,  // $first_event_at
	); err != nil {
		return fmt.Errorf("can't insert user to users table: %s", err)
	}
	query := `INSERT INTO product_analytics.users_distinct_id (project_id, distinct_id, "$user_id") VALUES (?, ?, ?)`
	if err := u.conn.Exec(context.Background(), query, session.ProjectID, session.UserUUID, user.UserID); err != nil {
		return fmt.Errorf("can't insert user to users_distinct_id table: %s", err)
	}
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
	user := &model.User{}
	if err := u.conn.QueryRow(context.Background(), selectQuery, projectID, userID).ScanStruct(user); err != nil {
		return nil, fmt.Errorf("can't get user from database: %s", err)
	}
	return user, nil
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
		user.FirstEventAt,       // $first_event_at
	); err != nil {
		return fmt.Errorf("can't insert user to users table: %s", err)
	}
	return nil
}

func (u *usersImpl) Delete(projectID uint32, userID string) error {
	query := `INSERT INTO product_analytics.users (project_id, user_id, _deleted_at) VALUES (?, ?, ?)`
	return u.conn.Exec(context.Background(), query, projectID, userID, time.Now())
}
