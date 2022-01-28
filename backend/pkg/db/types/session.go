package types

import "database/sql"

type Session struct {
	SessionID      uint64         `db:"session_id" json:"session_id;omitempty"`
	Timestamp      uint64         `db:"start_ts" json:"start_ts;omitempty"`
	ProjectID      uint32         `db:"project_id" json:"project_id;omitempty"`
	TrackerVersion sql.NullString `db:"tracker_version" json:"tracker_version;omitempty"`
	RevID          sql.NullString `db:"rev_id" json:"rev_id;omitempty"`
	UserUUID       string         `db:"user_uuid" json:"user_uuid;omitempty"`
	UserOS         sql.NullString `db:"user_os" json:"user_os;omitempty"`
	UserOSVersion  sql.NullString `db:"user_os_version" json:"user_os_version;omitempty"`
	UserDevice     sql.NullString `db:"user_device" json:"user_device;omitempty"`
	UserCountry    string         `db:"user_country" json:"user_country;omitempty"`

	Duration        *uint64 `db:"duration" json:"duration;omitempty"`
	PagesCount      int
	EventsCount     int
	ErrorsCount     int
	UserID          sql.NullString `db:"user_id" json:"user_id;omitempty"`
	UserAnonymousID sql.NullString `db:"user_anonymous_id" json:"user_anonymous_id;omitempty"`
	Metadata1       sql.NullString `db:"metadata_1" json:"metadata_1;omitempty"`
	Metadata2       sql.NullString `db:"metadata_2" json:"metadata_2;omitempty"`
	Metadata3       sql.NullString `db:"metadata_3" json:"metadata_3;omitempty"`
	Metadata4       sql.NullString `db:"metadata_4" json:"metadata_4;omitempty"`
	Metadata5       sql.NullString `db:"metadata_5" json:"metadata_5;omitempty"`
	Metadata6       sql.NullString `db:"metadata_6" json:"metadata_6;omitempty"`
	Metadata7       sql.NullString `db:"metadata_7" json:"metadata_7;omitempty"`
	Metadata8       sql.NullString `db:"metadata_8" json:"metadata_8;omitempty"`
	Metadata9       sql.NullString `db:"metadata_9" json:"metadata_9;omitempty"`
	Metadata10      sql.NullString `db:"metadata_10" json:"metadata_10;omitempty"`

	Platform string
	// Only-web properties
	UserAgent            string
	UserBrowser          string
	UserBrowserVersion   string
	UserDeviceType       string
	UserDeviceMemorySize uint64
	UserDeviceHeapSize   uint64
}

func (s *Session) SetMetadata(keyNo uint, value string) {
	switch keyNo {
	case 1:
		s.Metadata1 = sql.NullString{value,true}
	case 2:
		s.Metadata2 = sql.NullString{value,true}
	case 3:
		s.Metadata3 = sql.NullString{value,true}
	case 4:
		s.Metadata4 = sql.NullString{value,true}
	case 5:
		s.Metadata5 = sql.NullString{value,true}
	case 6:
		s.Metadata6 = sql.NullString{value,true}
	case 7:
		s.Metadata7 = sql.NullString{value,true}
	case 8:
		s.Metadata8 = sql.NullString{value,true}
	case 9:
		s.Metadata9 = sql.NullString{value,true}
	case 10:
		s.Metadata10 = sql.NullString{value,true}
	}
}
