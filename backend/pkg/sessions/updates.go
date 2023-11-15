package sessions

import (
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v4"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/metrics/database"
)

type Updates interface {
	AddUserID(sessionID uint64, userID string)
	AddAnonID(sessionID uint64, userID string)
	SetReferrer(sessionID uint64, referrer, baseReferrer string)
	SetMetadata(sessionID uint64, keyNo uint, value string)
	AddEvents(sessionID uint64, events, pages int)
	AddIssues(sessionID uint64, errors, issues int)
	Commit()
}

type updatesImpl struct {
	db      pool.Pool
	updates map[uint64]*sessionUpdate
}

func NewSessionUpdates(db pool.Pool) Updates {
	return &updatesImpl{
		db:      db,
		updates: make(map[uint64]*sessionUpdate),
	}
}

func (u *updatesImpl) AddUserID(sessionID uint64, userID string) {
	if u.updates[sessionID] == nil {
		u.updates[sessionID] = NewSessionUpdate(sessionID)
	}
	u.updates[sessionID].setUserID(userID)
}

func (u *updatesImpl) AddAnonID(sessionID uint64, userID string) {
	if u.updates[sessionID] == nil {
		u.updates[sessionID] = NewSessionUpdate(sessionID)
	}
	u.updates[sessionID].setUserID(userID)
}

func (u *updatesImpl) SetReferrer(sessionID uint64, referrer, baseReferrer string) {
	if u.updates[sessionID] == nil {
		u.updates[sessionID] = NewSessionUpdate(sessionID)
	}
	u.updates[sessionID].setReferrer(referrer, baseReferrer)
}

func (u *updatesImpl) SetMetadata(sessionID uint64, keyNo uint, value string) {
	if u.updates[sessionID] == nil {
		u.updates[sessionID] = NewSessionUpdate(sessionID)
	}
	u.updates[sessionID].setMetadata(keyNo, value)
}

func (u *updatesImpl) AddEvents(sessionID uint64, events, pages int) {
	if u.updates[sessionID] == nil {
		u.updates[sessionID] = NewSessionUpdate(sessionID)
	}
	u.updates[sessionID].addEvents(events, pages)
}

func (u *updatesImpl) AddIssues(sessionID uint64, errors, issues int) {
	if u.updates[sessionID] == nil {
		u.updates[sessionID] = NewSessionUpdate(sessionID)
	}
	u.updates[sessionID].addIssues(errors, issues)
}

func (u *updatesImpl) Commit() {
	b := &pgx.Batch{}
	for _, upd := range u.updates {
		if str, args := upd.request(); str != "" {
			b.Queue(str, args...)
		}
	}
	// Record batch size
	database.RecordBatchElements(float64(b.Len()))

	start := time.Now()

	// Send batch to db and execute
	br := u.db.SendBatch(b)
	l := b.Len()
	failed := false
	for i := 0; i < l; i++ {
		if _, err := br.Exec(); err != nil {
			log.Printf("Error in PG batch.Exec(): %v \n", err)
			failed = true
			break
		}
	}
	if err := br.Close(); err != nil {
		log.Printf("Error in PG batch.Close(): %v \n", err)
	}
	if failed {
		for _, upd := range u.updates {
			if str, args := upd.request(); str != "" {
				if err := u.db.Exec(str, args...); err != nil {
					log.Printf("Error in PG Exec(): %v \n", err)
				}
			}
		}
	}
	database.RecordBatchInsertDuration(float64(time.Now().Sub(start).Milliseconds()))
	u.updates = make(map[uint64]*sessionUpdate)
}

type sessionUpdate struct {
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

func NewSessionUpdate(sessionID uint64) *sessionUpdate {
	return &sessionUpdate{
		sessionID: sessionID,
		pages:     0,
		events:    0,
		errors:    0,
		issues:    0,
		metadata:  make(map[uint]string),
	}
}

func (su *sessionUpdate) setUserID(userID string) {
	su.userID = &userID
}

func (su *sessionUpdate) setAnonID(anonID string) {
	su.anonID = &anonID
}

func (su *sessionUpdate) setReferrer(referrer, baseReferrer string) {
	su.referrer = &referrer
	su.baseReferrer = &baseReferrer
}

func (su *sessionUpdate) setMetadata(keyNo uint, value string) {
	su.metadata[keyNo] = value
}

func (su *sessionUpdate) addEvents(events, pages int) {
	su.events += events
	su.pages += pages
}

func (su *sessionUpdate) addIssues(errors, issues int) {
	su.errors += errors
	su.issues += issues
}

func (su *sessionUpdate) request() (string, []interface{}) {
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
