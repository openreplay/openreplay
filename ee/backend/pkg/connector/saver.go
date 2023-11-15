package connector

import (
	"fmt"
	"log"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/sessions"
	"strconv"
	"time"

	config "openreplay/backend/internal/config/connector"
	"openreplay/backend/pkg/messages"
)

// Saver collect sessions and events and saves them to Redshift
type Saver struct {
	cfg              *config.Config
	db               Database
	sessModule       sessions.Sessions
	projModule       projects.Projects
	sessions         map[uint64]map[string]string
	updatedSessions  map[uint64]bool
	lastUpdate       map[uint64]time.Time
	finishedSessions []uint64
	events           []map[string]string
}

func New(cfg *config.Config, db Database, sessions sessions.Sessions, projects projects.Projects) *Saver {
	if cfg == nil {
		log.Fatal("connector config is empty")
	}
	// Validate column names in sessions table
	if err := validateColumnNames(sessionColumns); err != nil {
		log.Printf("can't validate column names: %s", err)
	}
	// Validate column names in events table
	if err := validateColumnNames(eventColumns); err != nil {
		log.Printf("can't validate column names: %s", err)
	}
	return &Saver{
		cfg:             cfg,
		db:              db,
		sessModule:      sessions,
		projModule:      projects,
		updatedSessions: make(map[uint64]bool, 0),
		lastUpdate:      make(map[uint64]time.Time, 0),
	}
}

func handleEvent(msg messages.Message) map[string]string {
	event := make(map[string]string)

	switch m := msg.(type) {
	case *messages.ConsoleLog:
		event["consolelog_level"] = QUOTES(m.Level)
		event["consolelog_value"] = QUOTES(m.Value)
	case *messages.CustomEvent:
		event["customevent_name"] = QUOTES(m.Name)
		event["customevent_payload"] = QUOTES(m.Payload)
	case *messages.JSException:
		event["jsexception_name"] = QUOTES(m.Name)
		event["jsexception_message"] = QUOTES(m.Message)
		event["jsexception_payload"] = QUOTES(m.Payload)
		event["jsexception_metadata"] = QUOTES(m.Metadata)
	case *messages.NetworkRequest:
		event["networkrequest_type"] = QUOTES(m.Type)
		event["networkrequest_method"] = QUOTES(m.Method)
		event["networkrequest_url"] = QUOTES(m.URL)
		event["networkrequest_request"] = QUOTES(m.Request)
		event["networkrequest_response"] = QUOTES(m.Response)
		event["networkrequest_status"] = fmt.Sprintf("%d", m.Status)
		event["networkrequest_timestamp"] = fmt.Sprintf("%d", m.Timestamp)
		event["networkrequest_duration"] = fmt.Sprintf("%d", m.Duration)
	case *messages.IssueEvent:
		event["issueevent_message_id"] = fmt.Sprintf("%d", m.MessageID)
		event["issueevent_timestamp"] = fmt.Sprintf("%d", m.Timestamp)
		event["issueevent_type"] = QUOTES(m.Type)
		event["issueevent_context_string"] = QUOTES(m.ContextString)
		event["issueevent_context"] = QUOTES(m.Context)
		event["issueevent_payload"] = QUOTES(m.Payload)
		event["issueevent_url"] = QUOTES(m.URL)
	case *messages.CustomIssue:
		event["customissue_name"] = QUOTES(m.Name)
		event["customissue_payload"] = QUOTES(m.Payload)
	}

	if len(event) == 0 {
		return nil
	}
	event["sessionid"] = fmt.Sprintf("%d", msg.SessionID())
	event["received_at"] = fmt.Sprintf("%d", uint64(time.Now().UnixMilli()))
	event["batch_order_number"] = fmt.Sprintf("%d", 0)
	return event
}

func (s *Saver) updateSessionInfoFromCache(sessID uint64, sess map[string]string) error {
	info, err := s.sessModule.Get(sessID)
	if err != nil {
		return err
	}
	// Check all required fields are present
	if info.Duration != nil {
		sess["session_duration"] = fmt.Sprintf("%d", *info.Duration)
	}
	if sess["session_start_timestamp"] == "" {
		sess["session_start_timestamp"] = fmt.Sprintf("%d", info.Timestamp)
	}
	if sess["session_end_timestamp"] == "" && info.Duration != nil {
		sess["session_end_timestamp"] = fmt.Sprintf("%d", info.Timestamp+*info.Duration)
	}
	if sess["session_duration"] == "" && sess["session_start_timestamp"] != "" && sess["session_end_timestamp"] != "" {
		start, err := strconv.Atoi(sess["session_start_timestamp"])
		if err != nil {
			log.Printf("Error parsing session_start_timestamp: %v", err)
		}
		end, err := strconv.Atoi(sess["session_end_timestamp"])
		if err != nil {
			log.Printf("Error parsing session_end_timestamp: %v", err)
		}
		if start != 0 && end != 0 {
			sess["session_duration"] = fmt.Sprintf("%d", end-start)
		}
	}
	if sess["user_agent"] == "" && info.UserAgent != "" {
		sess["user_agent"] = QUOTES(info.UserAgent)
	}
	if sess["user_browser"] == "" && info.UserBrowser != "" {
		sess["user_browser"] = QUOTES(info.UserBrowser)
	}
	if sess["user_browser_version"] == "" && info.UserBrowserVersion != "" {
		sess["user_browser_version"] = QUOTES(info.UserBrowserVersion)
	}
	if sess["user_os"] == "" && info.UserOS != "" {
		sess["user_os"] = QUOTES(info.UserOS)
	}
	if sess["user_os_version"] == "" && info.UserOSVersion != "" {
		sess["user_os_version"] = QUOTES(info.UserOSVersion)
	}
	if sess["user_device"] == "" && info.UserDevice != "" {
		sess["user_device"] = QUOTES(info.UserDevice)
	}
	if sess["user_device_type"] == "" && info.UserDeviceType != "" {
		sess["user_device_type"] = QUOTES(info.UserDeviceType)
	}
	if sess["user_device_memory_size"] == "" && info.UserDeviceMemorySize != 0 {
		sess["user_device_memory_size"] = fmt.Sprintf("%d", info.UserDeviceMemorySize)
	}
	if sess["user_device_heap_size"] == "" && info.UserDeviceHeapSize != 0 {
		sess["user_device_heap_size"] = fmt.Sprintf("%d", info.UserDeviceHeapSize)
	}
	if sess["user_country"] == "" && info.UserCountry != "" {
		sess["user_country"] = QUOTES(info.UserCountry)
	}
	if sess["user_city"] == "" && info.UserCity != "" {
		sess["user_city"] = QUOTES(info.UserCity)
	}
	if sess["user_state"] == "" && info.UserState != "" {
		sess["user_state"] = QUOTES(info.UserState)
	}
	if sess["user_uuid"] == "" && info.UserUUID != "" {
		sess["user_uuid"] = QUOTES(info.UserUUID)
	}
	if sess["session_start_timestamp"] == "" && info.Timestamp != 0 {
		sess["session_start_timestamp"] = fmt.Sprintf("%d", info.Timestamp)
	}
	if sess["user_anonymous_id"] == "" && info.UserAnonymousID != nil {
		sess["user_anonymous_id"] = QUOTES(*info.UserAnonymousID)
	}
	if sess["user_id"] == "" && info.UserID != nil {
		sess["user_id"] = QUOTES(*info.UserID)
	}
	if sess["pages_count"] == "" && info.PagesCount != 0 {
		sess["pages_count"] = fmt.Sprintf("%d", info.PagesCount)
	}
	if sess["tracker_version"] == "" && info.TrackerVersion != "" {
		sess["tracker_version"] = QUOTES(info.TrackerVersion)
	}
	if sess["rev_id"] == "" && info.RevID != "" {
		sess["rev_id"] = QUOTES(info.RevID)
	}
	if info.ErrorsCount != 0 {
		sess["errors_count"] = fmt.Sprintf("%d", info.ErrorsCount)
	}
	if info.IssueScore != 0 {
		sess["issue_score"] = fmt.Sprintf("%d", info.IssueScore)
	}
	// Check int fields
	for _, field := range sessionInts {
		if sess[field] == "" {
			sess[field] = fmt.Sprintf("%d", 0)
		}
	}
	return nil
}

func (s *Saver) handleSession(msg messages.Message) {
	// Filter out messages that are not related to session table
	switch msg.(type) {
	case *messages.SessionStart, *messages.SessionEnd, *messages.ConnectionInformation, *messages.Metadata,
		*messages.PageEvent, *messages.PerformanceTrackAggr, *messages.UserID, *messages.UserAnonymousID,
		*messages.JSException, *messages.JSExceptionDeprecated, *messages.InputEvent, *messages.MouseClick,
		*messages.IssueEvent, *messages.IssueEventDeprecated:
	default:
		return
	}
	if s.sessions == nil {
		s.sessions = make(map[uint64]map[string]string)
	}
	sess, ok := s.sessions[msg.SessionID()]
	if !ok {
		// Try to load session from cache
		cached, err := s.sessModule.GetCached(msg.SessionID())
		if err != nil && err != sessions.ErrSessionNotFound {
			log.Printf("Failed to get cached session: %v", err)
		}
		if cached != nil {
			sess = cached
		} else {
			sess = make(map[string]string)
			sess[`sessionid`] = fmt.Sprintf("%d", msg.SessionID())
		}
	}
	if s.sessions[msg.SessionID()] == nil {
		s.sessions[msg.SessionID()] = make(map[string]string)
		s.sessions[msg.SessionID()][`sessionid`] = fmt.Sprintf("%d", msg.SessionID())
		sess = s.sessions[msg.SessionID()]
	}

	// Parse message and add to session
	updated := true
	switch m := msg.(type) {
	case *messages.SessionStart:
		sess["session_start_timestamp"] = fmt.Sprintf("%d", m.Timestamp)
		sess["user_uuid"] = QUOTES(m.UserUUID)
		sess["user_agent"] = QUOTES(m.UserAgent)
		sess["user_os"] = QUOTES(m.UserOS)
		sess["user_os_version"] = QUOTES(m.UserOSVersion)
		sess["user_browser"] = QUOTES(m.UserBrowser)
		sess["user_browser_version"] = QUOTES(m.UserBrowserVersion)
		sess["user_device"] = QUOTES(m.UserDevice)
		sess["user_device_type"] = QUOTES(m.UserDeviceType)
		sess["user_device_memory_size"] = fmt.Sprintf("%d", m.UserDeviceMemorySize)
		sess["user_device_heap_size"] = fmt.Sprintf("%d", m.UserDeviceHeapSize)
		sess["tracker_version"] = QUOTES(m.TrackerVersion)
		sess["rev_id"] = QUOTES(m.RevID)
		geoInfo := geoip.UnpackGeoRecord(m.UserCountry)
		sess["user_country"] = QUOTES(geoInfo.Country)
		sess["user_city"] = QUOTES(geoInfo.City)
		sess["user_state"] = QUOTES(geoInfo.State)
	case *messages.SessionEnd:
		sess["session_end_timestamp"] = fmt.Sprintf("%d", m.Timestamp)
		if err := s.updateSessionInfoFromCache(msg.SessionID(), sess); err != nil {
			log.Printf("Error updating session info from cache: %v", err)
		}
	case *messages.ConnectionInformation:
		sess["connection_effective_bandwidth"] = fmt.Sprintf("%d", m.Downlink)
		sess["connection_type"] = QUOTES(m.Type)
	case *messages.Metadata:
		session, err := s.sessModule.Get(msg.SessionID())
		if err != nil {
			log.Printf("Error getting session info: %v", err)
			break
		}
		project, err := s.projModule.GetProject(session.ProjectID)
		if err != nil {
			log.Printf("Error getting project info: %v", err)
			break
		}
		keyNo := project.GetMetadataNo(m.Key)
		if keyNo == 0 {
			break
		}
		sess[fmt.Sprintf("metadata_%d", keyNo)] = QUOTES(m.Value)
	case *messages.PageEvent:
		sess["referrer"] = QUOTES(m.Referrer)
		sess["first_contentful_paint"] = fmt.Sprintf("%d", m.FirstContentfulPaint)
		sess["speed_index"] = fmt.Sprintf("%d", m.SpeedIndex)
		sess["timing_time_to_interactive"] = fmt.Sprintf("%d", m.TimeToInteractive)
		sess["visually_complete"] = fmt.Sprintf("%d", m.VisuallyComplete)
		currUrlsCount, err := strconv.Atoi(sess["pages_count"])
		if err != nil {
			currUrlsCount = 0
		}
		sess["pages_count"] = fmt.Sprintf("%d", currUrlsCount+1)
	case *messages.PerformanceTrackAggr:
		sess["avg_cpu"] = fmt.Sprintf("%d", m.AvgCPU)
		sess["avg_fps"] = fmt.Sprintf("%d", m.AvgFPS)
		sess["max_cpu"] = fmt.Sprintf("%d", m.MaxCPU)
		sess["max_fps"] = fmt.Sprintf("%d", m.MaxFPS)
		sess["max_total_js_heap_size"] = fmt.Sprintf("%d", m.MaxTotalJSHeapSize)
		sess["max_used_js_heap_size"] = fmt.Sprintf("%d", m.MaxUsedJSHeapSize)
	case *messages.UserID:
		if m.ID != "" {
			sess["user_id"] = QUOTES(m.ID)
		}
	case *messages.UserAnonymousID:
		sess["user_anonymous_id"] = QUOTES(m.ID)
	case *messages.JSException, *messages.JSExceptionDeprecated:
		currExceptionsCount, err := strconv.Atoi(sess["js_exceptions_count"])
		if err != nil {
			currExceptionsCount = 0
		}
		sess["js_exceptions_count"] = fmt.Sprintf("%d", currExceptionsCount+1)
	case *messages.InputEvent:
		currInputsCount, err := strconv.Atoi(sess["inputs_count"])
		if err != nil {
			currInputsCount = 0
		}
		sess["inputs_count"] = fmt.Sprintf("%d", currInputsCount+1)
	case *messages.MouseClick:
		currMouseClicksCount, err := strconv.Atoi(sess["clicks_count"])
		if err != nil {
			currMouseClicksCount = 0
		}
		sess["clicks_count"] = fmt.Sprintf("%d", currMouseClicksCount+1)
	case *messages.IssueEvent, *messages.IssueEventDeprecated:
		currIssuesCount, err := strconv.Atoi(sess["issues_count"])
		if err != nil {
			currIssuesCount = 0
		}
		sess["issues_count"] = fmt.Sprintf("%d", currIssuesCount+1)
	default:
		updated = false
	}
	if updated {
		if s.updatedSessions == nil {
			s.updatedSessions = make(map[uint64]bool)
		}
		s.updatedSessions[msg.SessionID()] = true
	}
	s.sessions[msg.SessionID()] = sess
	s.lastUpdate[msg.SessionID()] = time.Now()
}

func (s *Saver) Handle(msg messages.Message) {
	newEvent := handleEvent(msg)
	if newEvent != nil {
		if s.events == nil {
			s.events = make([]map[string]string, 0, 2)
		}
		s.events = append(s.events, newEvent)
	}
	s.handleSession(msg)
	if msg.TypeID() == messages.MsgSessionEnd {
		if s.finishedSessions == nil {
			s.finishedSessions = make([]uint64, 0)
		}
		s.finishedSessions = append(s.finishedSessions, msg.SessionID())
	}
	return
}

func (s *Saver) commitEvents() {
	if len(s.events) == 0 {
		log.Printf("empty events batch")
		return
	}
	if err := s.db.InsertEvents(s.events); err != nil {
		log.Printf("can't insert events: %s", err)
	}
	s.events = nil
}

func (s *Saver) commitSessions() {
	if len(s.finishedSessions) == 0 {
		log.Printf("empty sessions batch")
		return
	}
	l := len(s.finishedSessions)
	sessions := make([]map[string]string, 0, len(s.finishedSessions))
	toKeep := make([]uint64, 0, len(s.finishedSessions))
	toSend := make([]uint64, 0, len(s.finishedSessions))
	for _, sessionID := range s.finishedSessions {
		// ts, now, ts+1min
		if s.lastUpdate[sessionID].Add(time.Minute * 1).After(time.Now()) {
			toKeep = append(toKeep, sessionID)
		} else {
			sessions = append(sessions, s.sessions[sessionID])
			toSend = append(toSend, sessionID)
		}
	}
	if err := s.db.InsertSessions(sessions); err != nil {
		log.Printf("can't insert sessions: %s", err)
	}
	log.Printf("finished: %d, to keep: %d, to send: %d", l, len(toKeep), len(toSend))
	// Clear current list of finished sessions
	for _, sessionID := range toSend {
		delete(s.sessions, sessionID)   // delete session info
		delete(s.lastUpdate, sessionID) // delete last session update timestamp
	}
	s.finishedSessions = toKeep
}

// Commit saves batch to Redshift
func (s *Saver) Commit() {
	// Cache updated sessions
	start := time.Now()
	for sessionID, _ := range s.updatedSessions {
		if err := s.sessModule.AddCached(sessionID, s.sessions[sessionID]); err != nil {
			log.Printf("Error adding session to cache: %v", err)
		}
	}
	log.Printf("Cached %d sessions in %s", len(s.updatedSessions), time.Since(start))
	s.updatedSessions = nil
	// Commit events and sessions (send to Redshift)
	s.commitEvents()
	s.checkZombieSessions()
	s.commitSessions()
}

func (s *Saver) checkZombieSessions() {
	// Check if there are old sessions that should be sent to Redshift
	finished := make(map[uint64]bool, len(s.finishedSessions))
	for _, sessionID := range s.finishedSessions {
		finished[sessionID] = true
	}
	now := time.Now()
	zombieSessionsCount := 0
	for sessionID, _ := range s.sessions {
		if finished[sessionID] {
			continue
		}
		if s.lastUpdate[sessionID].Add(time.Minute * 5).Before(now) {
			// Check that session is not in progress, check all critical values (startTs, endTs, etc)
			// If session has been finished more than 5 minutes ago, send it to Redshift
			// Else update last update timestamp and try to wait for session end.
			// Do that several times (save attempts number) after last attempt delete session from memory to avoid sessions with not filled fields
			zombieSession := s.sessions[sessionID]
			if zombieSession["session_start_timestamp"] == "" || zombieSession["session_end_timestamp"] == "" {
				// Let's try to load session from cache
				if err := s.updateSessionInfoFromCache(sessionID, zombieSession); err != nil {
					log.Printf("Error updating zombie session info from cache: %v", err)
				} else {
					s.sessions[sessionID] = zombieSession
					log.Printf("Updated zombie session info from cache: %v", zombieSession)
				}
			}
			if zombieSession["session_start_timestamp"] == "" || zombieSession["session_end_timestamp"] == "" {
				s.lastUpdate[sessionID] = now
				continue
			}
			s.finishedSessions = append(s.finishedSessions, sessionID)
			zombieSessionsCount++
		}
	}
	if zombieSessionsCount > 0 {
		log.Printf("Found %d zombie sessions", zombieSessionsCount)
	}
}

func (s *Saver) Close() error {
	// Close connection to Redshift
	return nil
}

var reservedWords = []string{"ALL", "ANALYSE", "ANALYZE", "AND", "ANY", "ARRAY", "AS", "ASC", "ASYMMETRIC", "BOTH", "CASE", "CAST", "CHECK", "COLLATE", "COLUMN", "CONSTRAINT", "CREATE", "CROSS", "CURRENT_CATALOG", "CURRENT_DATE", "CURRENT_ROLE", "CURRENT_SCHEMA", "CURRENT_TIME", "CURRENT_TIMESTAMP", "CURRENT_USER", "DEFAULT", "DEFERRABLE", "DESC", "DISTINCT", "DO", "ELSE", "END", "EXCEPT", "FALSE", "FOR", "FOREIGN", "FREEZE", "FROM", "FULL", "GRANT", "GROUP", "HAVING", "ILIKE", "IN", "INITIALLY", "INNER", "INTERSECT", "INTO", "IS", "ISNULL", "JOIN", "LEADING", "LEFT", "LIKE", "LIMIT", "LOCALTIME", "LOCALTIMESTAMP", "NATURAL", "NEW", "NOT", "NOTNULL", "NULL", "OFF", "OFFSET", "OLD", "ON", "ONLY", "OR", "ORDER", "OUTER", "OVERLAPS", "PLACING", "PRIMARY", "REFERENCES", "RETURNING", "RIGHT", "SELECT", "SESSION_USER", "SIMILAR", "SOME", "SYMMETRIC", "TABLE", "THEN", "TO", "TRAILING", "TRUE", "UNION", "UNIQUE", "USER", "USING", "VERBOSE", "WHEN", "WHERE", "WINDOW", "WITH"}

func validateColumnNames(columns []string) error {
	for _, column := range columns {
		for _, reservedWord := range reservedWords {
			if column == reservedWord {
				return fmt.Errorf("column name %s is a reserved word", column)
			}
		}
	}
	return nil
}
