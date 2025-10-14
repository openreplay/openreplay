package notes

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

const (
	MaxMessageLength = 250
	MaxTagLength     = 10
	MaxGetLimit      = 100 // Maximum number of notes to return in a single request
	DefaultLimit     = 9
	DefaultPage      = 1
)

type notesImpl struct {
	log logger.Logger
	db  pool.Pool
}

type Notes interface {
	Create(projectID, userID uint64, note *Note) (*Note, error)
	GetBySessionID(projectID, userID, sessionID uint64) (interface{}, error)
	GetByID(projectID, userID, noteID uint64) (*Note, error)
	GetAll(projectID, userID uint64, opts *GetOpts) (interface{}, error)
	Update(projectID, userID, noteID uint64, note *NoteUpdate) (*Note, error)
	Delete(projectID, noteID uint64) error
}

func New(log logger.Logger, db pool.Pool) (Notes, error) {
	return &notesImpl{
		log: log,
		db:  db,
	}, nil
}

func (n *notesImpl) Create(projectID, userID uint64, note *Note) (*Note, error) {
	switch {
	case projectID == 0:
		return nil, errors.New("projectID is required")
	case userID == 0:
		return nil, errors.New("userID is required")
	case note == nil:
		return nil, errors.New("note is required")
	}

	if len(*note.Message) > MaxMessageLength {
		*note.Message = (*note.Message)[0:MaxMessageLength]
	}
	if note.Tag != nil && len(*note.Tag) > MaxTagLength {
		*note.Tag = (*note.Tag)[0:MaxTagLength]
	}
	var createdAt time.Time

	err := insertNote(n.db, note, projectID, userID).Scan(&note.ID, &createdAt, &note.UserName)
	if err != nil {
		n.log.Error(context.Background(), "Failed to create note: %v", err)
		return nil, err
	}
	note.CreatedAt = createdAt.UnixMilli()
	return note, nil
}

func (n *notesImpl) GetBySessionID(projectID, userID, sessionID uint64) (interface{}, error) {
	switch {
	case projectID == 0:
		return nil, errors.New("projectID is required")
	case userID == 0:
		return nil, errors.New("userID is required")
	case sessionID == 0:
		return nil, errors.New("sessionID is required")
	}

	rows, err := selectSessionNotes(n.db, projectID, sessionID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch notes by session ID: %v", err)
	}
	defer rows.Close()
	notes := make([]Note, 0)
	var createdAt time.Time
	for rows.Next() {
		var note Note
		if err := rows.Scan(&note.ID, &note.Message, &createdAt, &note.Tag, &note.SessionID,
			&note.Timestamp, &note.IsPublic, &note.Thumbnail, &note.StartAt, &note.EndAt, &note.UserName); err != nil {
			n.log.Error(context.Background(), "Failed to scan note: %v", err)
			continue
		}
		note.CreatedAt = createdAt.UnixMilli()
		notes = append(notes, note)
	}
	return notes, nil
}

func (n *notesImpl) GetByID(projectID, userID, noteID uint64) (*Note, error) {
	switch {
	case projectID == 0:
		return nil, errors.New("projectID is required")
	case userID == 0:
		return nil, errors.New("userID is required")
	case noteID == 0:
		return nil, errors.New("noteID is required")
	}

	var (
		note      Note
		createdAt time.Time
	)
	err := selectNote(n.db, projectID, userID, noteID).Scan(&note.ID, &note.Message, &createdAt, &note.Tag, &note.SessionID,
		&note.Timestamp, &note.IsPublic, &note.Thumbnail, &note.StartAt, &note.EndAt, &note.UserName)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch note by ID: %v", err)
	}
	note.CreatedAt = createdAt.UnixMilli()
	return &note, nil
}

func (n *notesImpl) getByIDToShare(projectID, userID, noteID, shareID uint64) (*Note, error) {
	switch {
	case projectID == 0:
		return nil, errors.New("projectID is required")
	case userID == 0:
		return nil, errors.New("userID is required")
	case noteID == 0:
		return nil, errors.New("noteID is required")
	case shareID == 0:
		return nil, errors.New("shareID is required")
	}

	var (
		note      Note
		createdAt time.Time
	)
	err := selectNoteToShare(n.db, projectID, userID, noteID, shareID).Scan(&note.ID, &note.Message, &createdAt, &note.Tag, &note.SessionID,
		&note.Timestamp, &note.IsPublic, &note.Thumbnail, &note.StartAt, &note.EndAt, &note.UserName, &note.ShareName)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch note by ID: %v", err)
	}
	note.CreatedAt = createdAt.UnixMilli()
	return &note, nil
}

func (n *notesImpl) GetAll(projectID, userID uint64, opts *GetOpts) (interface{}, error) {
	switch {
	case projectID == 0:
		return nil, errors.New("projectID is required")
	case userID == 0:
		return nil, errors.New("userID is required")
	case opts == nil:
		return nil, errors.New("opts is required")
	}
	if opts.Limit > MaxGetLimit {
		opts.Limit = MaxGetLimit
	}
	if opts.Limit <= 0 {
		opts.Limit = DefaultLimit
	}
	if opts.Page <= 0 {
		opts.Page = DefaultPage
	}
	if opts.Sort != "createdAt" {
		opts.Sort = "createdAt" // Default sort
	}
	if opts.Order != "ASC" && opts.Order != "DESC" {
		opts.Order = "DESC" // Default order
	}
	n.log.Info(context.Background(), "%+v", opts)
	conditionsList := make([]string, 0)
	conditionsList = append(conditionsList, fmt.Sprintf("sessions_notes.project_id = %d", projectID))
	conditionsList = append(conditionsList, fmt.Sprintf("sessions_notes.deleted_at IS NULL"))

	if len(opts.Tags) > 0 {
		tags := make([]string, len(opts.Tags))
		for i, tag := range opts.Tags {
			tags[i] = fmt.Sprintf("'%s'", tag)
		}
		conditionsList = append(conditionsList, fmt.Sprintf("sessions_notes.tag IN (%s)", strings.Join(tags, ",")))
	}
	if opts.SharedOnly {
		conditionsList = append(conditionsList, "sessions_notes.is_public IS TRUE")
	}
	if opts.MineOnly {
		conditionsList = append(conditionsList, fmt.Sprintf("sessions_notes.user_id = %d", userID))
	} else {
		conditionsList = append(conditionsList, fmt.Sprintf("(sessions_notes.user_id = %d OR sessions_notes.is_public)", userID))
	}
	if opts.Search != "" {
		conditionsList = append(conditionsList, fmt.Sprintf("sessions_notes.message ILIKE '%%%s%%'", opts.Search))
	}

	sql := fmt.Sprintf(`
		SELECT COUNT(1) OVER () AS full_count, sessions_notes.note_id, sessions_notes.user_id, sessions_notes.message, sessions_notes.created_at,
		       sessions_notes.tag, sessions_notes.session_id, sessions_notes.timestamp, sessions_notes.is_public,
		       sessions_notes.thumbnail, sessions_notes.start_at, sessions_notes.end_at, users.name AS user_name
		FROM sessions_notes
		INNER JOIN users USING (user_id)
		WHERE %s
		ORDER BY created_at %s
		LIMIT %d OFFSET %d;`, strings.Join(conditionsList, " AND "), opts.Order, opts.Limit, (opts.Page-1)*opts.Limit)
	n.log.Info(context.Background(), "Getting sessions notes: %s", sql)
	rows, err := n.db.Query(sql)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch notes: %v", err)
	}
	defer rows.Close()
	var (
		notes     []Note
		fullCount int
		createdAt time.Time
	)
	for rows.Next() {
		var note Note
		if err := rows.Scan(&fullCount, &note.ID, &note.UserID, &note.Message, &createdAt, &note.Tag, &note.SessionID,
			&note.Timestamp, &note.IsPublic, &note.Thumbnail, &note.StartAt, &note.EndAt, &note.UserName); err != nil {
			n.log.Error(context.Background(), "Failed to scan note: %v", err)
			continue
		}
		note.CreatedAt = createdAt.UnixMilli()
		notes = append(notes, note)
	}
	res := make(map[string]interface{})
	res["count"] = fullCount
	res["notes"] = notes
	return res, nil
}

func (n *notesImpl) Update(projectID, userID, noteID uint64, note *NoteUpdate) (*Note, error) {
	switch {
	case projectID == 0:
		return nil, errors.New("projectID is required")
	case userID == 0:
		return nil, errors.New("userID is required")
	case noteID == 0:
		return nil, errors.New("noteID is required")
	case note == nil:
		return nil, errors.New("note is required")
	}

	conditionsList := make([]string, 0)
	if note.Message != nil && *note.Message != "" {
		if len(*note.Message) > MaxMessageLength {
			*note.Message = (*note.Message)[0:MaxMessageLength]
		}
		conditionsList = append(conditionsList, fmt.Sprintf("message = '%s'", *note.Message))
	}
	if note.Tag != nil && *note.Tag != "" {
		if len(*note.Tag) > MaxTagLength {
			*note.Tag = (*note.Tag)[0:MaxTagLength]
		}
		conditionsList = append(conditionsList, fmt.Sprintf("tag = '%s'", *note.Tag))
	}
	if note.IsPublic != nil {
		if *note.IsPublic {
			conditionsList = append(conditionsList, "is_public = TRUE")
		} else {
			conditionsList = append(conditionsList, "is_public = FALSE")
		}
	}
	if note.Timestamp != nil && *note.Timestamp != 0 {
		conditionsList = append(conditionsList, fmt.Sprintf("timestamp = %d", *note.Timestamp))
	}
	conditionsList = append(conditionsList, "updated_at = timezone('utc'::text, now())")

	var (
		updatedNote Note
		createdAt   time.Time
	)
	err := updateNote(n.db, projectID, userID, noteID, conditionsList).Scan(&updatedNote.ID, &updatedNote.Message, &createdAt,
		&updatedNote.Tag, &updatedNote.SessionID, &updatedNote.Timestamp, &updatedNote.IsPublic,
		&updatedNote.Thumbnail, &updatedNote.StartAt, &updatedNote.EndAt, &updatedNote.UserName)
	if err != nil {
		return nil, fmt.Errorf("failed to update note: %v", err)
	}
	updatedNote.CreatedAt = createdAt.UnixMilli()
	return &updatedNote, nil
}

func (n *notesImpl) Delete(projectID, noteID uint64) error {
	switch {
	case projectID == 0:
		return errors.New("projectID is required")
	case noteID == 0:
		return errors.New("noteID is required")
	}
	sql := `UPDATE sessions_notes
			SET deleted_at = timezone('utc'::text, now())
			WHERE note_id = $1 AND project_id = $2 AND deleted_at ISNULL;`
	err := n.db.Exec(sql, noteID, projectID)
	if err != nil {
		return fmt.Errorf("failed to delete note: %v", err)
	}
	return nil
}
