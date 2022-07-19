package postgres

import . "openreplay/backend/pkg/db/types"

func (conn *Conn) GetSession(sessionID uint64) (*Session, error) {
	s := &Session{SessionID: sessionID}
	var revID, userOSVersion *string
	if err := conn.c.QueryRow(`
		SELECT platform,
			duration, project_id, start_ts,
			user_uuid, user_os, user_os_version, 
			user_device, user_device_type, user_country,
			rev_id, tracker_version,
			user_id, user_anonymous_id,
			metadata_1, metadata_2, metadata_3, metadata_4, metadata_5,
			metadata_6, metadata_7, metadata_8, metadata_9, metadata_10
		FROM sessions
		WHERE session_id=$1 
	`,
		sessionID,
	).Scan(&s.Platform,
		&s.Duration, &s.ProjectID, &s.Timestamp,
		&s.UserUUID, &s.UserOS, &userOSVersion,
		&s.UserDevice, &s.UserDeviceType, &s.UserCountry,
		&revID, &s.TrackerVersion,
		&s.UserID, &s.UserAnonymousID,
		&s.Metadata1, &s.Metadata2, &s.Metadata3, &s.Metadata4, &s.Metadata5,
		&s.Metadata6, &s.Metadata7, &s.Metadata8, &s.Metadata9, &s.Metadata10); err != nil {
		return nil, err
	}
	if userOSVersion != nil { // TODO: choose format, make f
		s.UserOSVersion = *userOSVersion
	}
	if revID != nil {
		s.RevID = *revID
	}
	return s, nil
}
