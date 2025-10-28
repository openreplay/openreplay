package session

func (s *serviceImpl) GetFileKey(sessID uint64) (*string, error) {
	sql := `SELECT encode(file_key,'hex') AS file_key
            FROM public.sessions
            WHERE session_id = $1;`

	var key *string
	err := s.conn.QueryRow(sql, sessID).Scan(&key)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	return key, nil
}
