package sessions

import (
	"github.com/lib/pq"
)

func (s *storageImpl) GetMany(sessionIDs []uint64) ([]*Session, error) {
	rows, err := s.db.Query(`
	SELECT
		session_id,
		CASE
			WHEN duration IS NULL OR duration < 0 THEN 0
			ELSE duration
		END,
		start_ts
	FROM sessions
	WHERE session_id = ANY($1)`, pq.Array(sessionIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	sessions := make([]*Session, 0, len(sessionIDs))
	for rows.Next() {
		sess := &Session{}
		if err := rows.Scan(&sess.SessionID, &sess.Duration, &sess.Timestamp); err != nil {
			return nil, err
		}
		sessions = append(sessions, sess)
	}
	return sessions, nil
}
