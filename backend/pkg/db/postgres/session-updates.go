package postgres

// Mechanism of combination several session updates into one
const sessionUpdateReq = `UPDATE sessions SET pages_count = pages_count + $1, events_count = events_count + $2, errors_count = errors_count + $3, issue_score = issue_score + $4 WHERE session_id = $5`

type sessionUpdates struct {
	sessionID uint64
	pages     int
	events    int
	errors    int
	issues    int
}

func NewSessionUpdates(sessionID uint64) *sessionUpdates {
	return &sessionUpdates{
		sessionID: sessionID,
		pages:     0,
		events:    0,
		errors:    0,
		issues:    0,
	}
}

func (su *sessionUpdates) addEvents(pages, events int) {
	su.pages += pages
	su.events += events
}

func (su *sessionUpdates) addIssues(errors, issues int) {
	su.errors += errors
	su.issues += issues
}

func (su *sessionUpdates) request() (string, []interface{}) {
	if su.pages == 0 && su.events == 0 {
		return "", nil
	}
	return sessionUpdateReq, []interface{}{su.pages, su.events, su.errors, su.issues, su.sessionID}
}
