package sessions

import (
	"fmt"
)

type sessionUpdates struct {
	sessionID    uint64
	userID       *string
	anonID       *string
	referrer     *string
	baseReferrer *string
	metadata     map[uint]string
	pages        int
	events       int
	errors       int
	issues       int
}

func NewSessionUpdates(sessionID uint64) *sessionUpdates {
	return &sessionUpdates{
		sessionID: sessionID,
		pages:     0,
		events:    0,
		errors:    0,
		issues:    0,
		metadata:  make(map[uint]string),
	}
}

func (su *sessionUpdates) setUserID(userID string) {
	su.userID = &userID
}

func (su *sessionUpdates) setAnonID(anonID string) {
	su.anonID = &anonID
}

func (su *sessionUpdates) setReferrer(referrer, baseReferrer string) {
	su.referrer = &referrer
	su.baseReferrer = &baseReferrer
}

func (su *sessionUpdates) setMetadata(keyNo uint, value string) {
	su.metadata[keyNo] = value
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
	sqlReq := "UPDATE sessions SET"
	sqlArgs := make([]interface{}, 0)
	varsCounter := 0

	if su.userID != nil {
		varsCounter++
		sqlReq += fmt.Sprintf(" user_id = LEFT($%d, 8000),", varsCounter)
		sqlArgs = append(sqlArgs, *su.userID)
	}
	if su.anonID != nil {
		varsCounter++
		sqlReq += fmt.Sprintf(" user_anonymous_id = LEFT($%d, 8000),", varsCounter)
		sqlArgs = append(sqlArgs, *su.anonID)
	}
	if su.referrer != nil {
		varsCounter += 2
		sqlReq += fmt.Sprintf(" referrer = LEFT($%d, 8000), base_referrer = LEFT($%d, 8000),", varsCounter-1, varsCounter)
		sqlArgs = append(sqlArgs, *su.referrer, *su.baseReferrer)
	}
	for keyNo, value := range su.metadata {
		varsCounter++
		sqlReq += fmt.Sprintf(" metadata_%d = LEFT($%d, 8000),", keyNo, varsCounter)
		sqlArgs = append(sqlArgs, value)
	}
	if su.pages > 0 {
		varsCounter++
		sqlReq += fmt.Sprintf(" pages_count = pages_count + $%d,", varsCounter)
		sqlArgs = append(sqlArgs, su.pages)
	}
	if su.events > 0 {
		varsCounter++
		sqlReq += fmt.Sprintf(" events_count = events_count + $%d,", varsCounter)
		sqlArgs = append(sqlArgs, su.events)
	}
	if su.errors > 0 {
		varsCounter++
		sqlReq += fmt.Sprintf(" errors_count = errors_count + $%d,", varsCounter)
		sqlArgs = append(sqlArgs, su.errors)
	}
	if su.issues > 0 {
		varsCounter++
		sqlReq += fmt.Sprintf(" issue_score = issue_score + $%d,", varsCounter)
		sqlArgs = append(sqlArgs, su.issues)
	}

	if varsCounter == 0 {
		return "", nil
	}
	varsCounter++
	sqlReq = sqlReq[:len(sqlReq)-1] + fmt.Sprintf(" WHERE session_id = $%d", varsCounter)
	sqlArgs = append(sqlArgs, su.sessionID)

	return sqlReq, sqlArgs
}
