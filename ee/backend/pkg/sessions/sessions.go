package sessions

import (
	"context"
	"fmt"
	"openreplay/backend/pkg/metrics/database"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/url"
)

type Sessions interface {
	Add(session *Session) error
	AddCached(sessionID uint64, data map[string]string) error
	Get(sessionID uint64) (*Session, error)
	GetUpdated(sessionID uint64, keepInCache bool) (*Session, error)
	GetCached(sessionID uint64) (map[string]string, error)
	GetDuration(sessionID uint64) (uint64, error)
	GetManySessions(sessionIDs []uint64) (map[uint64]*Session, error)
	UpdateDuration(sessionID uint64, timestamp uint64) (uint64, error)
	UpdateEncryptionKey(sessionID uint64, key []byte) error
	UpdateUserID(sessionID uint64, userID string) error
	UpdateAnonymousID(sessionID uint64, userAnonymousID string) error
	UpdateReferrer(sessionID uint64, referrer string) error
	UpdateUTM(sessionID uint64, url string) error
	UpdateMetadata(sessionID uint64, key, value string) error
	UpdateEventsStats(sessionID uint64, events, pages int) error
	UpdateIssuesStats(sessionID uint64, errors, issueScore int) error
	Commit()
}

type sessionsImpl struct {
	log      logger.Logger
	cache    Cache
	storage  Storage
	updates  Updates
	projects projects.Projects
}

func New(log logger.Logger, db pool.Pool, proj projects.Projects, redis *redis.Client, metrics database.Database) Sessions {
	return &sessionsImpl{
		log:      log,
		cache:    NewInMemoryCache(log, NewCache(redis, metrics)),
		storage:  NewStorage(db),
		updates:  NewSessionUpdates(log, db, metrics),
		projects: proj,
	}
}

// Add usage: /start endpoint in http service
func (s *sessionsImpl) Add(session *Session) error {
	ctx := context.WithValue(context.Background(), "sessionID", session.SessionID)
	if cachedSession, err := s.cache.Get(session.SessionID); err == nil {
		s.log.Info(ctx, "[!] Session already exists in cache, new: %+v, cached: %+v", session, cachedSession)
	}
	err := s.storage.Add(session)
	if err != nil {
		return err
	}
	proj, err := s.projects.GetProject(session.ProjectID)
	if err != nil {
		return err
	}
	session.SaveRequestPayload = proj.SaveRequestPayloads
	if err := s.cache.Set(session); err != nil {
		s.log.Warn(ctx, "failed to cache session: %s", err)
	}
	return nil
}

func (s *sessionsImpl) getFromDB(sessionID uint64) (*Session, error) {
	session, err := s.storage.Get(sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session from postgres: %s", err)
	}
	proj, err := s.projects.GetProject(session.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get active project: %d, err: %s", session.ProjectID, err)
	}
	session.SaveRequestPayload = proj.SaveRequestPayloads
	return session, nil
}

// Get usage: db message processor + connectors in feature
func (s *sessionsImpl) Get(sessionID uint64) (*Session, error) {
	if sess, err := s.cache.Get(sessionID); err == nil {
		return sess, nil
	}

	// Get from postgres and update in-memory and redis caches
	session, err := s.getFromDB(sessionID)
	if err != nil {
		return nil, err
	}
	s.cache.Set(session)
	return session, nil
}

// Special method for clickhouse connector
func (s *sessionsImpl) GetUpdated(sessionID uint64, keepInCache bool) (*Session, error) {
	session, err := s.getFromDB(sessionID)
	if err != nil {
		return nil, err
	}
	if !keepInCache {
		return session, nil
	}
	if err := s.cache.Set(session); err != nil {
		ctx := context.WithValue(context.Background(), "sessionID", sessionID)
		s.log.Warn(ctx, "failed to cache session: %s", err)
	}
	return session, nil
}

func (s *sessionsImpl) AddCached(sessionID uint64, data map[string]string) error {
	return s.cache.SetCache(sessionID, data)
}

func (s *sessionsImpl) GetCached(sessionID uint64) (map[string]string, error) {
	return s.cache.GetCache(sessionID)
}

// GetDuration usage: in ender to check current and new duration to avoid duplicates
func (s *sessionsImpl) GetDuration(sessionID uint64) (uint64, error) {
	if sess, err := s.cache.Get(sessionID); err == nil {
		if sess.Duration != nil {
			return *sess.Duration, nil
		}
		return 0, nil
	}
	session, err := s.getFromDB(sessionID)
	if err != nil {
		return 0, err
	}
	if err := s.cache.Set(session); err != nil {
		ctx := context.WithValue(context.Background(), "sessionID", sessionID)
		s.log.Warn(ctx, "failed to cache session: %s", err)
	}
	if session.Duration != nil {
		return *session.Duration, nil
	}
	return 0, nil
}

// GetManySessions is useful for the ender service only (grab session's startTs and duration)
func (s *sessionsImpl) GetManySessions(sessionIDs []uint64) (map[uint64]*Session, error) {
	res := make(map[uint64]*Session, len(sessionIDs))
	toRequest := make([]uint64, 0, len(sessionIDs))
	// Grab sessions from the cache
	for _, sessionID := range sessionIDs {
		if sess, err := s.cache.Get(sessionID); err == nil {
			res[sessionID] = sess
		} else {
			toRequest = append(toRequest, sessionID)
		}
	}
	if len(toRequest) == 0 {
		return res, nil
	}
	// Grab the rest from the database
	sessionFromDB, err := s.storage.GetMany(toRequest)
	if err != nil {
		return nil, err
	}
	for _, sess := range sessionFromDB {
		res[sess.SessionID] = sess
	}
	return res, nil
}

// UpdateDuration usage: in ender to update session duration
func (s *sessionsImpl) UpdateDuration(sessionID uint64, timestamp uint64) (uint64, error) {
	newDuration, err := s.storage.UpdateDuration(sessionID, timestamp)
	if err != nil {
		return 0, err
	}
	// Update session info in cache for future usage (for example in connectors)
	session, err := s.getFromDB(sessionID)
	if err != nil {
		return 0, err
	}

	session.Duration = &newDuration
	if err := s.cache.Set(session); err != nil {
		ctx := context.WithValue(context.Background(), "sessionID", sessionID)
		s.log.Warn(ctx, "failed to cache session: %s", err)
	}
	return newDuration, nil
}

// UpdateEncryptionKey usage: in ender to update session encryption key if encryption is enabled
func (s *sessionsImpl) UpdateEncryptionKey(sessionID uint64, key []byte) error {
	ctx := context.WithValue(context.Background(), "sessionID", sessionID)
	if err := s.storage.InsertEncryptionKey(sessionID, key); err != nil {
		return err
	}
	if session, err := s.cache.Get(sessionID); err != nil {
		session.EncryptionKey = string(key)
		if err := s.cache.Set(session); err != nil {
			s.log.Warn(ctx, "failed to cache session: %s", err)
		}
		return nil
	}
	session, err := s.getFromDB(sessionID)
	if err != nil {
		s.log.Error(ctx, "failed to get session from postgres: %s", err)
		return nil
	}
	if err := s.cache.Set(session); err != nil {
		s.log.Warn(ctx, "failed to cache session: %s", err)
	}
	return nil
}

// UpdateUserID usage: in db handler
func (s *sessionsImpl) UpdateUserID(sessionID uint64, userID string) error {
	s.updates.AddUserID(sessionID, userID)
	return nil
}

// UpdateAnonymousID usage: in db handler
func (s *sessionsImpl) UpdateAnonymousID(sessionID uint64, userAnonymousID string) error {
	s.updates.AddUserID(sessionID, userAnonymousID)
	return nil
}

// UpdateReferrer usage: in db handler on each page event
func (s *sessionsImpl) UpdateReferrer(sessionID uint64, referrer string) error {
	if referrer == "" {
		return nil
	}
	baseReferrer := url.DiscardURLQuery(referrer)
	s.updates.SetReferrer(sessionID, referrer, baseReferrer)
	return nil
}

func (s *sessionsImpl) UpdateUTM(sessionID uint64, pageUrl string) error {
	params, err := url.GetURLQueryParams(pageUrl)
	if err != nil {
		return err
	}
	utmSource := params["utm_source"]
	utmMedium := params["utm_medium"]
	utmCampaign := params["utm_campaign"]
	if utmSource == "" && utmMedium == "" && utmCampaign == "" {
		return nil
	}
	s.updates.SetUTM(sessionID, utmSource, utmMedium, utmCampaign)
	return nil
}

// UpdateMetadata usage: in db handler on each metadata event
func (s *sessionsImpl) UpdateMetadata(sessionID uint64, key, value string) error {
	session, err := s.Get(sessionID)
	if err != nil {
		return err
	}
	project, err := s.projects.GetProject(session.ProjectID)
	if err != nil {
		return err
	}

	keyNo := project.GetMetadataNo(key)
	if keyNo == 0 {
		return nil
	}

	s.updates.SetMetadata(sessionID, keyNo, value)
	return nil
}

func (s *sessionsImpl) UpdateEventsStats(sessionID uint64, events, pages int) error {
	s.updates.AddEvents(sessionID, events, pages)
	return nil
}

func (s *sessionsImpl) UpdateIssuesStats(sessionID uint64, errors, issueScore int) error {
	s.updates.AddIssues(sessionID, errors, issueScore)
	return nil
}

func (s *sessionsImpl) Commit() {
	s.updates.Commit()
}
