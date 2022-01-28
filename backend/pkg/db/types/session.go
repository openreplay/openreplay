package types

type Session struct {
	SessionID      uint64 `db:"session_id" json:"session_id;omitempty"`
	Timestamp      uint64 `db:"start_ts" json:"start_ts;omitempty"`
	ProjectID      uint32 `db:"project_id" json:"project_id;omitempty"`
	TrackerVersion string `db:"tracker_version" json:"tracker_version;omitempty"`
	RevID          string `db:"rev_id" json:"rev_id;omitempty"`
	UserUUID       string `db:"user_uuid" json:"user_uuid;omitempty"`
	UserOS         string `db:"user_os" json:"user_os;omitempty"`
	UserOSVersion  string `db:"user_os_version" json:"user_os_version;omitempty"`
	UserDevice     string `db:"user_device" json:"user_device;omitempty"`
	UserCountry    string `db:"user_country" json:"user_country;omitempty"`

	Duration        *uint64 `db:"duration" json:"duration;omitempty"`
	PagesCount      int
	EventsCount     int
	ErrorsCount     int
	UserID          string `db:"user_id" json:"user_id;omitempty"`
	UserAnonymousID string `db:"user_anonymous_id" json:"user_anonymous_id;omitempty"`
	Metadata1       string `db:"metadata_1" json:"metadata_1;omitempty"`
	Metadata2       string `db:"metadata_2" json:"metadata_2;omitempty"`
	Metadata3       string `db:"metadata_3" json:"metadata_3;omitempty"`
	Metadata4       string `db:"metadata_4" json:"metadata_4;omitempty"`
	Metadata5       string `db:"metadata_5" json:"metadata_5;omitempty"`
	Metadata6       string `db:"metadata_6" json:"metadata_6;omitempty"`
	Metadata7       string `db:"metadata_7" json:"metadata_7;omitempty"`
	Metadata8       string `db:"metadata_8" json:"metadata_8;omitempty"`
	Metadata9       string `db:"metadata_9" json:"metadata_9;omitempty"`
	Metadata10      string `db:"metadata_10" json:"metadata_10;omitempty"`

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
		s.Metadata1 = value
	case 2:
		s.Metadata2 = value
	case 3:
		s.Metadata3 = value
	case 4:
		s.Metadata4 = value
	case 5:
		s.Metadata5 = value
	case 6:
		s.Metadata6 = value
	case 7:
		s.Metadata7 = value
	case 8:
		s.Metadata8 = value
	case 9:
		s.Metadata9 = value
	case 10:
		s.Metadata10 = value
	}
}
