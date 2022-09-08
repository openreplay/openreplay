package autocomplete

import (
	"log"
	"openreplay/backend/pkg/db/bulk"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/sessions"
)

type Autocompletes interface {
	InsertValue(sessionID uint64, projectID uint32, tp string, value string)
}

// TODO: remove
type CH interface {
	InsertAutocomplete(session *sessions.Session, msgType, msgValue string) error
}

func (a *autocompletesImpl) SetClickHouse(ch CH) {
	a.chConn = ch
}

type autocompletesImpl struct {
	db            postgres.Pool
	autocompletes bulk.Bulk
	// TODO: remove temp ch impl
	chConn CH
}

func New(db postgres.Pool) (Autocompletes, error) {
	a := &autocompletesImpl{
		db: db,
	}
	a.init()
	return a, nil
}

func (a *autocompletesImpl) init() {
	var err error
	a.autocompletes, err = bulk.NewBulk(a.db,
		"autocomplete",
		"(value, type, project_id)",
		"($%d, $%d, $%d)",
		3, 100)
	if err != nil {
		log.Fatalf("can't create autocomplete bulk")
	}
}

func (a *autocompletesImpl) InsertValue(sessionID uint64, projectID uint32, tp string, value string) {
	if len(value) == 0 {
		return
	}
	if err := a.autocompletes.Append(value, tp, projectID); err != nil {
		log.Printf("autocomplete bulk err: %s", err)
	}
	if a.chConn == nil {
		return
	}
	// Send autocomplete data to clickhouse
	if err := a.chConn.InsertAutocomplete(&sessions.Session{SessionID: sessionID, ProjectID: projectID}, tp, value); err != nil {
		log.Printf("click house autocomplete err: %s", err)
	}
}

func (a *autocompletesImpl) Commit() {
	if err := a.autocompletes.Send(); err != nil {
		log.Printf("autocomplete bulk send err: %s", err)
	}
}
