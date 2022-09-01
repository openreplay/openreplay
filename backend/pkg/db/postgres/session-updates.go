package postgres

// Mechanism of combination several session updates into one
const sessionUpdateReq = `UPDATE sessions SET pages_count = pages_count + $1, events_count = events_count + $2 WHERE session_id = $3`

type sessionUpdates struct {
	sessionID uint64
	pages     int
	events    int
}

func NewSessionUpdates(sessionID uint64) *sessionUpdates {
	return &sessionUpdates{
		sessionID: sessionID,
		pages:     0,
		events:    0,
	}
}

func (su *sessionUpdates) add(pages, events int) {
	su.pages += pages
	su.events += events
}

func (su *sessionUpdates) request() (string, []interface{}) {
	if su.pages == 0 && su.events == 0 {
		return "", nil
	}
	return sessionUpdateReq, []interface{}{su.pages, su.events, su.sessionID}
}
