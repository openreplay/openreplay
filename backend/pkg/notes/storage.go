package notes

import (
	"fmt"
	"strings"

	"github.com/jackc/pgx/v4"

	"openreplay/backend/pkg/db/postgres/pool"
)

func insertNote(db pool.Pool, note *Note, projectID, userID uint64) pgx.Row {
	sql := `INSERT INTO sessions_notes (message, user_id, tag, session_id, project_id, timestamp, is_public, thumbnail, start_at, end_at) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING note_id, created_at, (SELECT name FROM users WHERE users.user_id=$2) AS user_name;`
	return db.QueryRow(sql, note.Message, userID, note.Tag, note.SessionID, projectID, note.Timestamp, note.IsPublic, note.Thumbnail, note.StartAt, note.EndAt)
}

func selectSessionNotes(db pool.Pool, projectID, sessionID, userID uint64) (pgx.Rows, error) {
	sql := `SELECT sessions_notes.note_id, sessions_notes.message, sessions_notes.created_at, 
		       sessions_notes.tag, sessions_notes.session_id, sessions_notes.timestamp, sessions_notes.is_public, 
		       sessions_notes.thumbnail, sessions_notes.start_at, sessions_notes.end_at, users.name AS user_name
			FROM sessions_notes
			INNER JOIN users USING (user_id)
			WHERE sessions_notes.project_id = $1 AND sessions_notes.deleted_at IS NULL AND sessions_notes.session_id = $2 
			AND (sessions_notes.user_id = $3 OR sessions_notes.is_public)
		ORDER BY created_at DESC;`
	return db.Query(sql, projectID, sessionID, userID)
}

func selectNote(db pool.Pool, projectID, userID, noteID uint64) pgx.Row {
	sql := `SELECT sessions_notes.note_id, sessions_notes.message, sessions_notes.created_at, 
		       sessions_notes.tag, sessions_notes.session_id, sessions_notes.timestamp, sessions_notes.is_public, 
		       sessions_notes.thumbnail, sessions_notes.start_at, sessions_notes.end_at, users.name AS user_name
			FROM sessions_notes
			INNER JOIN users USING (user_id)
			WHERE sessions_notes.project_id = $1 AND sessions_notes.deleted_at IS NULL AND sessions_notes.note_id = $2 
			AND (sessions_notes.user_id = $3 OR sessions_notes.is_public);`
	return db.QueryRow(sql, projectID, noteID, userID)
}

func selectNoteToShare(db pool.Pool, projectID, userID, noteID, shareID uint64) pgx.Row {
	sql := `SELECT sessions_notes.note_id, sessions_notes.message, sessions_notes.created_at, 
		       sessions_notes.tag, sessions_notes.session_id, sessions_notes.timestamp, sessions_notes.is_public, 
		       sessions_notes.thumbnail, sessions_notes.start_at, sessions_notes.end_at, users.name AS user_name,
		       (SELECT name FROM users WHERE user_id = $4 AND deleted_at ISNULL) AS share_name
			FROM sessions_notes
			INNER JOIN users USING (user_id)
			WHERE sessions_notes.project_id = $1 AND sessions_notes.deleted_at IS NULL AND sessions_notes.note_id = $2 
			AND (sessions_notes.user_id = $3 OR sessions_notes.is_public);`
	return db.QueryRow(sql, projectID, noteID, userID, shareID)
}

func updateNote(db pool.Pool, projectID, userID, noteID uint64, conditionsList []string) pgx.Row {
	sql := fmt.Sprintf(`
		UPDATE sessions_notes SET %s 
        WHERE project_id = $1 AND user_id = $2 AND note_id = $3 AND deleted_at ISNULL
        RETURNING sessions_notes.note_id, sessions_notes.message, sessions_notes.created_at, 
		       sessions_notes.tag, sessions_notes.session_id, sessions_notes.timestamp, sessions_notes.is_public, 
		       sessions_notes.thumbnail, sessions_notes.start_at, sessions_notes.end_at,
            (SELECT name FROM users WHERE user_id = $2) AS user_name;`, strings.Join(conditionsList, ","))
	return db.QueryRow(sql, projectID, userID, noteID)
}
