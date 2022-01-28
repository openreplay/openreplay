package postgres

//import 	. "openreplay/backend/pkg/messages"
import . "openreplay/backend/pkg/db/types"

//import "log"

func (conn *Conn) GetSession(sessionID uint64) (*Session, error) {
	s := &Session{SessionID: sessionID}
	var revID, userOSVersion *string
	if err := conn.queryRow(`
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

// func (conn *Conn) GetSessionClickEvents(sessionID uint64) (list []IOSClickEvent, err error) {
// 	rows, err := conn.query(`
// 		SELECT
// 			timestamp, seq_index, label
// 		FROM events_ios.clicks
// 		WHERE session_id=$1
// 	`, sessionID)
// 	if err != nil {
// 		return err
// 	}
// 	defer rows.Close()
// 	for rows.Next() {
// 		e := new(IOSClickEvent)
// 		if err = rows.Scan(&e.Timestamp, &e.Index, &e.Label); err != nil {
// 			log.Printf("Error while scanning click events: %v", err)
// 		} else {
// 			list = append(list, e)
// 		}
// 	}
// 	return list
// }

// func (conn *Conn) GetSessionInputEvents(sessionID uint64) (list []IOSInputEvent, err error) {
// 	rows, err := conn.query(`
// 		SELECT
// 			timestamp, seq_index, label, value
// 		FROM events_ios.inputs
// 		WHERE session_id=$1
// 	`, sessionID)
// 	if err != nil {
// 		return err
// 	}
// 	defer rows.Close()
// 	for rows.Next() {
// 		e := new(IOSInputEvent)
// 		if err = rows.Scan(&e.Timestamp, &e.Index, &e.Label, &e.Value); err != nil {
// 			log.Printf("Error while scanning click events: %v", err)
// 		} else {
// 			list = append(list, e)
// 		}
// 	}
// 	return list
// }

// func (conn *Conn) GetSessionCrashEvents(sessionID uint64) (list []IOSCrash, err error) {
// 	rows, err := conn.query(`
// 		SELECT
// 			timestamp, seq_index
// 		FROM events_ios.crashes
// 		WHERE session_id=$1
// 	`, sessionID)
// 	if err != nil {
// 		return err
// 	}
// 	defer rows.Close()
// 	for rows.Next() {
// 		e := new(IOSCrash)
// 		if err = rows.Scan(&e.Timestamp, &e.Index, &e.Label, &e.Value); err != nil {
// 			log.Printf("Error while scanning click events: %v", err)
// 		} else {
// 			list = append(list, e)
// 		}
// 	}
// 	return list
// }
