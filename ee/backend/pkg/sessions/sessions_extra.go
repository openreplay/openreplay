package sessions

func (s *sessionsImpl) GetManySessions(sessionIDs []uint64) (map[uint64]*Session, error) {
	res := make(map[uint64]*Session, len(sessionIDs))
	toRequest := make([]uint64, 0, len(sessionIDs))
	// Grab sessions from the cache
	for _, sessionID := range sessionIDs {
		if sess, err := s.cache.Get(sessionID); err == nil {
			res[sessionID] = sess
		} else {
			toRequest = append(toRequest, sessionID)
		}
	}
	if len(toRequest) == 0 {
		return res, nil
	}
	// Grab the rest from the database
	sessionFromDB, err := s.storage.GetMany(toRequest)
	if err != nil {
		return nil, err
	}
	for _, sess := range sessionFromDB {
		res[sess.SessionID] = sess
	}
	return res, nil
}
