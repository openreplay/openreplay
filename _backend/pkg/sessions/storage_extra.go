package sessions

import "errors"

func (s *storageImpl) GetMany(sessionIDs []uint64) ([]*Session, error) {
	return nil, errors.New("not implemented")
}
