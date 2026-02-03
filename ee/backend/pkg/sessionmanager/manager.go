package sessionmanager

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"openreplay/backend/internal/config/assist"
	"openreplay/backend/pkg/logger"
)

const (
	NodeKeyPattern          = "assist:nodes:*"
	ActiveSessionPrefix     = "assist:online_sessions:"
	RecentlyUpdatedSessions = "assist:updated_sessions"
)

type SessionData struct {
	Timestamp    uint64             `json:"timestamp"`
	ProjectID    string             `json:"projectID"`
	SessionID    string             `json:"sessionID"`
	UserID       *string            `json:"userID"`
	UserUUID     *string            `json:"userUUID"`
	UserOS       *string            `json:"userOs"`
	UserBrowser  *string            `json:"userBrowser"`
	UserDevice   *string            `json:"userDevice"`
	UserPlatform *string            `json:"userDeviceType"` // is
	UserCountry  *string            `json:"userCountry"`    // is
	UserState    *string            `json:"userState"`      // is
	UserCity     *string            `json:"userCity"`       // is
	Metadata     *map[string]string `json:"metadata"`       // contains
	IsActive     bool               `json:"active"`
	Raw          interface{}
}

type SessionManager interface {
	Start()
	Stop()
	GetByID(projectID, sessionID string) (interface{}, error)
	GetAll(projectID string, filters []*Filter, sort SortOrder, page, limit int) ([]interface{}, int, map[string]map[string]int, error)
	Autocomplete(projectID string, key FilterType, value string) ([]interface{}, error)
}

type sessionManagerImpl struct {
	ctx       context.Context
	log       logger.Logger
	client    *redis.Client
	ticker    *time.Ticker
	wg        *sync.WaitGroup
	stopChan  chan struct{}
	mutex     *sync.RWMutex
	cache     map[string]*SessionData
	sorted    []*SessionData
	batchSize int
	scanSize  int64
}

func New(log logger.Logger, cfg *assist.Config, redis *redis.Client) (SessionManager, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is required")
	case log == nil:
		return nil, fmt.Errorf("logger is required")
	case redis == nil:
		return nil, fmt.Errorf("redis client is required")
	}
	sm := &sessionManagerImpl{
		ctx:       context.Background(),
		log:       log,
		client:    redis,
		ticker:    time.NewTicker(cfg.CacheTTL),
		wg:        &sync.WaitGroup{},
		stopChan:  make(chan struct{}),
		mutex:     &sync.RWMutex{},
		cache:     make(map[string]*SessionData),
		sorted:    make([]*SessionData, 0),
		batchSize: cfg.BatchSize,
		scanSize:  cfg.ScanSize,
	}
	return sm, nil
}

func (sm *sessionManagerImpl) Start() {
	sm.log.Debug(sm.ctx, "Starting session manager...")

	go func() {
		sm.loadSessions()
		for {
			select {
			case <-sm.ticker.C:
				sm.updateSessions()
			case <-sm.stopChan:
				sm.log.Debug(sm.ctx, "Stopping session manager...")
				return
			}
		}
	}()
}

func (sm *sessionManagerImpl) Stop() {
	close(sm.stopChan)
	sm.ticker.Stop()
	sm.wg.Wait()
	if err := sm.client.Close(); err != nil {
		sm.log.Debug(sm.ctx, "Error closing Redis connection: %v", err)
	}
	sm.log.Debug(sm.ctx, "Session manager stopped")
}

func (sm *sessionManagerImpl) getNodeIDs() ([]string, error) {
	var nodeIDs = make([]string, 0, 16) // Let's assume we have at most 16 nodes
	var cursor uint64 = 0

	for {
		keys, nextCursor, err := sm.client.Scan(sm.ctx, cursor, NodeKeyPattern, 100).Result()
		if err != nil {
			return nil, fmt.Errorf("scan failed: %v", err)
		}
		for _, key := range keys {
			nodeIDs = append(nodeIDs, key)
		}
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
	return nodeIDs, nil
}

func (sm *sessionManagerImpl) getAllNodeSessions(nodeIDs []string) map[string]struct{} {
	allSessionIDs := make(map[string]struct{})
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, nodeID := range nodeIDs {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()

			sessionListJSON, err := sm.client.Get(sm.ctx, id).Result()
			if err != nil {
				if errors.Is(err, redis.Nil) {
					return
				}
				sm.log.Debug(sm.ctx, "Error getting session list for node %s: %v", id, err)
				return
			}

			var sessionList []string
			if err = json.Unmarshal([]byte(sessionListJSON), &sessionList); err != nil {
				sm.log.Debug(sm.ctx, "Error unmarshalling session list for node %s: %v", id, err)
				return
			}

			mu.Lock()
			for _, sessionID := range sessionList {
				allSessionIDs[sessionID] = struct{}{}
			}
			mu.Unlock()
		}(nodeID)
	}
	wg.Wait()
	return allSessionIDs
}

func (sm *sessionManagerImpl) getOnlineSessionIDs() (map[string]struct{}, error) {
	nodeIDs, err := sm.getNodeIDs()
	if err != nil {
		sm.log.Debug(sm.ctx, "Error getting node IDs: %v", err)
		return nil, err
	}
	sm.log.Debug(sm.ctx, "Found %d nodes", len(nodeIDs))

	allSessionIDs := sm.getAllNodeSessions(nodeIDs)
	sm.log.Debug(sm.ctx, "Collected %d unique session IDs", len(allSessionIDs))
	return allSessionIDs, nil
}

func (sm *sessionManagerImpl) getSessionData(sessionIDs []string) map[string]*SessionData {
	sessionData := make(map[string]*SessionData, len(sessionIDs))

	for i := 0; i < len(sessionIDs); i += sm.batchSize {
		end := i + sm.batchSize
		if end > len(sessionIDs) {
			end = len(sessionIDs)
		}
		batch := sessionIDs[i:end]

		keys := make([]string, len(batch))
		for j, id := range batch {
			keys[j] = ActiveSessionPrefix + id
		}

		results, err := sm.client.MGet(sm.ctx, keys...).Result()
		if err != nil {
			sm.log.Debug(sm.ctx, "Error in MGET operation: %v", err)
			continue // TODO: Handle the error
		}

		for j, result := range results {
			if result == nil {
				continue
			}

			strVal, ok := result.(string)
			if !ok {
				sm.log.Debug(sm.ctx, "Unexpected type for session data: %T", result)
				continue
			}

			var data SessionData
			if err := json.Unmarshal([]byte(strVal), &data); err != nil {
				sm.log.Debug(sm.ctx, "Error unmarshalling session data: %v", err)
				continue
			}
			raw := make(map[string]interface{})
			if err := json.Unmarshal([]byte(strVal), &raw); err != nil {
				sm.log.Debug(sm.ctx, "Error unmarshalling raw session data: %v", err)
				continue
			}
			data.Raw = raw
			sessionData[batch[j]] = &data
		}
		sm.log.Debug(sm.ctx, "Collected %d new sessions", len(results))
	}

	sm.wg.Wait()
	return sessionData
}

func (sm *sessionManagerImpl) updateCache(sessionsToAdd map[string]*SessionData, sessionsToRemove []string) {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	if sessionsToRemove != nil {
		for _, sessID := range sessionsToRemove {
			delete(sm.cache, sessID)
		}
	}
	if sessionsToAdd == nil {
		return
	}
	for sessID, session := range sessionsToAdd {
		sm.cache[sessID] = session
	}

	sessionList := make([]*SessionData, 0, len(sm.cache))
	for _, s := range sm.cache {
		sessionList = append(sessionList, s)
	}
	sort.Slice(sessionList, func(i, j int) bool {
		return sessionList[i].Timestamp < sessionList[j].Timestamp
	})
	sm.sorted = sessionList
}

func (sm *sessionManagerImpl) loadSessions() {
	startTime := time.Now()
	sm.log.Debug(sm.ctx, "Starting session processing cycle")

	sessIDs, err := sm.getOnlineSessionIDs()
	if err != nil {
		sm.log.Debug(sm.ctx, "Error getting online session IDs: %v", err)
		return
	}
	if len(sessIDs) == 0 {
		sm.log.Debug(sm.ctx, "No sessions found for nodes")
		return
	}
	allSessionIDsList := make([]string, 0, len(sessIDs))
	for sessionID := range sessIDs {
		allSessionIDsList = append(allSessionIDsList, sessionID)
	}
	sessionMap := sm.getSessionData(allSessionIDsList)
	sm.updateCache(sessionMap, nil)

	duration := time.Since(startTime)
	sm.log.Debug(sm.ctx, "Session processing cycle completed in %v. Processed %d sessions", duration, len(sm.cache))
}

func (sm *sessionManagerImpl) getAllRecentlyUpdatedSessions() (map[string]struct{}, error) {
	var (
		cursor   uint64
		allIDs   = make(map[string]struct{})
		batchIDs []string
		err      error
	)

	for {
		batchIDs, cursor, err = sm.client.SScan(sm.ctx, RecentlyUpdatedSessions, cursor, "*", sm.scanSize).Result()
		if err != nil {
			sm.log.Debug(sm.ctx, "Error scanning updated session IDs: %v", err)
			return nil, err
		}
		for _, id := range batchIDs {
			allIDs[id] = struct{}{}
		}
		if cursor == 0 {
			break
		}
	}

	if len(allIDs) == 0 {
		sm.log.Debug(sm.ctx, "No updated session IDs found")
		return allIDs, nil
	}

	var sessionIDsSlice []interface{}
	for id := range allIDs {
		sessionIDsSlice = append(sessionIDsSlice, id)
	}
	removed := sm.client.SRem(sm.ctx, RecentlyUpdatedSessions, sessionIDsSlice...).Val()
	sm.log.Debug(sm.ctx, "Fetched and removed %d session IDs from updated_session_set", removed)

	return allIDs, nil
}

func (sm *sessionManagerImpl) updateSessions() {
	startTime := time.Now()
	sm.log.Debug(sm.ctx, "Starting session processing cycle")

	sessIDs, err := sm.getOnlineSessionIDs()
	if err != nil {
		sm.log.Debug(sm.ctx, "Error getting online session IDs: %v", err)
		return
	}

	updatedSessIDs, err := sm.getAllRecentlyUpdatedSessions()
	if err != nil {
		sm.log.Debug(sm.ctx, "Error getting recently updated sessions: %v", err)
		return
	}

	sm.mutex.RLock()
	toAdd := make([]string, 0, len(updatedSessIDs))
	if updatedSessIDs == nil {
		updatedSessIDs = make(map[string]struct{})
	}
	for sessID, _ := range sessIDs {
		if _, exists := sm.cache[sessID]; !exists {
			updatedSessIDs[sessID] = struct{}{} // Add to updated sessions if not in cache
		}
	}
	for sessID, _ := range updatedSessIDs {
		toAdd = append(toAdd, sessID)
	}

	toRemove := make([]string, 0, len(sessIDs)/16)
	for sessID, _ := range sm.cache {
		if _, exists := sessIDs[sessID]; !exists {
			toRemove = append(toRemove, sessID)
		}
	}
	sm.mutex.RUnlock()

	// Load full session data from Redis
	newCache := sm.getSessionData(toAdd)
	sm.updateCache(newCache, toRemove)

	duration := time.Since(startTime)
	sm.log.Debug(sm.ctx, "Session processing cycle completed in %v. Processed %d sessions", duration, len(sm.cache))
}

var ErrSessionNotFound = errors.New("session not found")
var ErrSessionNotBelongToProject = errors.New("session does not belong to the project")

func (sm *sessionManagerImpl) GetByID(projectID, sessionID string) (interface{}, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("session ID is required")
	}

	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	sessionData, exists := sm.cache[sessionID]
	if !exists {
		return nil, ErrSessionNotFound
	}
	if sessionData.ProjectID != projectID {
		return nil, ErrSessionNotBelongToProject
	}
	return sessionData.Raw, nil
}

func (sm *sessionManagerImpl) GetAll(projectID string, filters []*Filter, sortOrder SortOrder, page, limit int) ([]interface{}, int, map[string]map[string]int, error) {
	if projectID == "" {
		return nil, 0, nil, fmt.Errorf("project ID is required")
	}

	counter := make(map[string]map[string]int)
	for _, filter := range filters {
		if _, ok := counter[string(filter.Type)]; !ok {
			counter[string(filter.Type)] = make(map[string]int)
		}
		for _, value := range filter.Value {
			counter[string(filter.Type)][value] = 0
		}
	}

	if page < 1 || limit < 1 {
		page, limit = 1, 10
	}
	start := (page - 1) * limit
	end := start + limit

	result := make([]interface{}, 0, limit)
	totalMatches := 0

	doFiltering := func(session *SessionData) {
		if session.ProjectID != projectID {
			return // TODO: keep sessions separate by projectID
		}
		if matchesFilters(session, filters, counter) {
			if totalMatches >= start && totalMatches < end {
				result = append(result, session.Raw)
			}
			totalMatches++
		}
	}

	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	if sortOrder == Asc {
		for _, session := range sm.sorted {
			doFiltering(session)
		}
	} else {
		for i := len(sm.sorted) - 1; i >= 0; i-- {
			doFiltering(sm.sorted[i])
		}
	}
	return result, totalMatches, counter, nil
}

func matchesFilters(session *SessionData, filters []*Filter, counter map[string]map[string]int) bool {
	if filters == nil || len(filters) == 0 {
		return true
	}
	matchedFilters := make(map[string][]string, len(filters))
	for _, filter := range filters {
		name := string(filter.Type)
		if _, ok := matchedFilters[name]; !ok {
			matchedFilters[name] = make([]string, 0, len(filter.Value))
		}
		var value string

		switch filter.Type {
		case UserID:
			if session.UserID != nil {
				value = *session.UserID
			}
		case UserAnonymousID:
			if session.UserUUID != nil {
				value = *session.UserUUID
			}
		case UserOS:
			if session.UserOS != nil {
				value = *session.UserOS
			}
		case UserBrowser:
			if session.UserBrowser != nil {
				value = *session.UserBrowser
			}
		case UserDevice:
			if session.UserDevice != nil {
				value = *session.UserDevice
			}
		case UserPlatform:
			if session.UserPlatform != nil {
				value = *session.UserPlatform
			}
		case UserCountry:
			if session.UserCountry != nil {
				value = *session.UserCountry
			}
		case UserState:
			if session.UserState != nil {
				value = *session.UserState
			}
		case UserCity:
			if session.UserCity != nil {
				value = *session.UserCity
			}
		case IsActive:
			if session.IsActive {
				value = "true"
			} else {
				value = "false"
			}
		default:
			if val, ok := (*session.Metadata)[name]; ok {
				value = val
			}
		}

		matched := false
		for _, filterValue := range filter.Value {
			if filter.Operator == Is && value != filterValue {
				continue
			} else if filter.Operator == Contains && !strings.Contains(strings.ToLower(value), strings.ToLower(filterValue)) {
				continue
			}
			matched = true
			matchedFilters[name] = append(matchedFilters[name], value)
		}
		if !matched {
			return false
		}
	}
	for values, filter := range matchedFilters {
		for _, value := range filter {
			counter[values][value]++
		}
	}
	return true
}

func (sm *sessionManagerImpl) Autocomplete(projectID string, key FilterType, value string) ([]interface{}, error) {
	matches := make(map[string]struct{}) // To ensure uniqueness
	lowerValue := strings.ToLower(value)

	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	for _, session := range sm.sorted {
		if session.ProjectID != projectID {
			continue
		}

		var fieldValue string
		switch key {
		case UserID:
			if session.UserID != nil {
				fieldValue = *session.UserID
			}
		case UserAnonymousID:
			if session.UserUUID != nil {
				fieldValue = *session.UserUUID
			}
		case UserOS:
			if session.UserOS != nil {
				fieldValue = *session.UserOS
			}
		case UserBrowser:
			if session.UserBrowser != nil {
				fieldValue = *session.UserBrowser
			}
		case UserDevice:
			if session.UserDevice != nil {
				fieldValue = *session.UserDevice
			}
		case UserState:
			if session.UserState != nil {
				fieldValue = *session.UserState
			}
		case UserCity:
			if session.UserCity != nil {
				fieldValue = *session.UserCity
			}
		default:
			if v, ok := (*session.Metadata)[string(key)]; ok {
				fieldValue = v
			}
		}

		if lowerValue == "" || (fieldValue != "" && strings.Contains(strings.ToLower(fieldValue), lowerValue)) {
			matches[fieldValue] = struct{}{}
		}
	}

	results := make([]interface{}, 0, len(matches))
	keyName := strings.ToUpper(string(key))
	type pair struct {
		Type  string `json:"type"`
		Value string `json:"value"`
	}
	for k := range matches {
		results = append(results, pair{Type: keyName, Value: k})
	}
	return results, nil
}
