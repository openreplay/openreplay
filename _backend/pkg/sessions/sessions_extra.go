package sessions

import "errors"

func (s *sessionsImpl) GetManySessions(sessionIDs []uint64) (map[uint64]*Session, error) {
	return nil, errors.New("not implemented")
}
