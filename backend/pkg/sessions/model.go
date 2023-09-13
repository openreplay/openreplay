package sessions

type Session struct {
	SessionID            uint64
	Timestamp            uint64
	Timezone             string
	ProjectID            uint32
	TrackerVersion       string
	RevID                string
	UserUUID             string
	UserOS               string
	UserOSVersion        string
	UserDevice           string
	UserCountry          string
	UserState            string
	UserCity             string
	Referrer             *string
	ReferrerBase         *string
	Duration             *uint64
	PagesCount           int
	EventsCount          int
	ErrorsCount          int
	IssueTypes           []string
	IssueScore           int
	UserID               *string
	UserAnonymousID      *string
	Metadata1            *string
	Metadata2            *string
	Metadata3            *string
	Metadata4            *string
	Metadata5            *string
	Metadata6            *string
	Metadata7            *string
	Metadata8            *string
	Metadata9            *string
	Metadata10           *string
	Platform             string
	UserAgent            string
	UserBrowser          string
	UserBrowserVersion   string
	UserDeviceType       string
	UserDeviceMemorySize uint64
	UserDeviceHeapSize   uint64
	SaveRequestPayload   bool
	EncryptionKey        string
}

func (s *Session) SetMetadata(keyNo uint, value string) {
	switch keyNo {
	case 1:
		s.Metadata1 = &value
	case 2:
		s.Metadata2 = &value
	case 3:
		s.Metadata3 = &value
	case 4:
		s.Metadata4 = &value
	case 5:
		s.Metadata5 = &value
	case 6:
		s.Metadata6 = &value
	case 7:
		s.Metadata7 = &value
	case 8:
		s.Metadata8 = &value
	case 9:
		s.Metadata9 = &value
	case 10:
		s.Metadata10 = &value
	}
}

type UnStartedSession struct {
	ProjectKey         string
	TrackerVersion     string
	DoNotTrack         bool
	Platform           string
	UserAgent          string
	UserOS             string
	UserOSVersion      string
	UserBrowser        string
	UserBrowserVersion string
	UserDevice         string
	UserDeviceType     string
	UserCountry        string
	UserState          string
	UserCity           string
}
