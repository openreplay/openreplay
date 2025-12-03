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
	if opts.Order != "ASC" && opts.Order != "DESC" {
		opts.Order = "DESC"
	}

	var (
		where  []string
		args   []interface{}
		argPos = 1
	)

	where = append(where, fmt.Sprintf("sessions_notes.project_id = $%d", argPos))
	args = append(args, projectID)
	argPos++

	where = append(where, "sessions_notes.deleted_at IS NULL")

	// tags: tag IN ($N, $N+1, ...)
	if len(opts.Tags) > 0 {
		tagPlaceholders := make([]string, 0, len(opts.Tags))
		for _, tag := range opts.Tags {
			tagPlaceholders = append(tagPlaceholders, fmt.Sprintf("$%d", argPos))
			args = append(args, tag)
			argPos++
		}
		where = append(where, fmt.Sprintf("sessions_notes.tag IN (%s)", strings.Join(tagPlaceholders, ",")))
	}

	if opts.SharedOnly {
		where = append(where, "sessions_notes.is_public IS TRUE")
	}
	if opts.MineOnly {
		where = append(where, fmt.Sprintf("sessions_notes.user_id = $%d", argPos))
		args = append(args, userID)
		argPos++
	} else {
		// (user_id = $N OR is_public)
		where = append(where, fmt.Sprintf("(sessions_notes.user_id = $%d OR sessions_notes.is_public)", argPos))
		args = append(args, userID)
		argPos++
	}

	if opts.Search != "" {
		where = append(where, fmt.Sprintf("sessions_notes.message ILIKE $%d", argPos))
		args = append(args, "%"+opts.Search+"%")
		argPos++
	}

	whereSQL := strings.Join(where, " AND ")
	sql := fmt.Sprintf(`
		SELECT COUNT(1) OVER () AS full_count,
		       sessions_notes.note_id, sessions_notes.user_id, sessions_notes.message, sessions_notes.created_at,
		       sessions_notes.tag, sessions_notes.session_id, sessions_notes.timestamp, sessions_notes.is_public,
		       sessions_notes.thumbnail, sessions_notes.start_at, sessions_notes.end_at, users.name AS user_name
		FROM sessions_notes
		INNER JOIN users USING (user_id)
		WHERE %s
		ORDER BY created_at %s
		LIMIT $%d OFFSET $%d;`,
		whereSQL, opts.Order, argPos, argPos+1,
	)
	args = append(args, opts.Limit, (opts.Page-1)*opts.Limit)

	rows, err := n.db.Query(sql, args...)
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

	res := map[string]interface{}{
		"count": fullCount,
		"notes": notes,
	}
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

	setParts := make([]string, 0, 4)
	args := make([]interface{}, 0, 6)
	argPos := 1

	if note.Message != nil && *note.Message != "" {
		if len(*note.Message) > MaxMessageLength {
			*note.Message = (*note.Message)[0:MaxMessageLength]
		}
		setParts = append(setParts, fmt.Sprintf("message = $%d", argPos))
		args = append(args, *note.Message)
		argPos++
	}

	if note.Tag != nil && *note.Tag != "" {
		if len(*note.Tag) > MaxTagLength {
			*note.Tag = (*note.Tag)[0:MaxTagLength]
		}
		setParts = append(setParts, fmt.Sprintf("tag = $%d", argPos))
		args = append(args, *note.Tag)
		argPos++
	}

	if note.IsPublic != nil {
		setParts = append(setParts, fmt.Sprintf("is_public = $%d", argPos))
		args = append(args, *note.IsPublic)
		argPos++
	}

	if note.Timestamp != nil && *note.Timestamp != 0 {
		setParts = append(setParts, fmt.Sprintf("timestamp = $%d", argPos))
		args = append(args, *note.Timestamp)
		argPos++
	}

	// Nothing to update, just return current object
	if len(setParts) == 0 {
		return n.GetByID(projectID, userID, noteID)
	}

	setParts = append(setParts, "updated_at = timezone('utc'::text, now())")

	sql := fmt.Sprintf(`
		UPDATE sessions_notes
		SET %s
		WHERE project_id = $%d AND note_id = $%d AND user_id = $%d
		RETURNING note_id, message, created_at, tag, session_id, timestamp, is_public, thumbnail, start_at, end_at,
		          (SELECT name FROM users WHERE users.user_id = sessions_notes.user_id) AS user_name
	`, strings.Join(setParts, ", "), argPos, argPos+1, argPos+2)

	args = append(args, projectID, noteID, userID)

	var (
		updatedNote Note
		createdAt   time.Time
	)

	err := n.db.QueryRow(sql, args...).Scan(
		&updatedNote.ID, &updatedNote.Message, &createdAt, &updatedNote.Tag, &updatedNote.SessionID,
		&updatedNote.Timestamp, &updatedNote.IsPublic, &updatedNote.Thumbnail, &updatedNote.StartAt, &updatedNote.EndAt,
		&updatedNote.UserName,
	)
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
