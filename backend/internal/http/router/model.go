package router

type StartSessionRequest struct {
	Token           string  `json:"token"`
	UserUUID        *string `json:"userUUID"`
	RevID           string  `json:"revID"`
	Timestamp       int64   `json:"timestamp"`
	TrackerVersion  string  `json:"trackerVersion"`
	IsSnippet       bool    `json:"isSnippet"`
	DeviceMemory    uint64  `json:"deviceMemory"`
	JsHeapSizeLimit uint64  `json:"jsHeapSizeLimit"`
	ProjectKey      *string `json:"projectKey"`
	Reset           bool    `json:"reset"`
	UserID          string  `json:"userID"`
}

type StartSessionResponse struct {
	Timestamp            int64  `json:"timestamp"`
	StartTimestamp       int64  `json:"startTimestamp"`
	Delay                int64  `json:"delay"`
	Token                string `json:"token"`
	UserUUID             string `json:"userUUID"`
	SessionID            string `json:"sessionID"`
	ProjectID            string `json:"projectID"`
	BeaconSizeLimit      int64  `json:"beaconSizeLimit"`
	CompressionThreshold int64  `json:"compressionThreshold"`
}

type NotStartedRequest struct {
	ProjectKey     *string `json:"projectKey"`
	TrackerVersion string  `json:"trackerVersion"`
	DoNotTrack     bool    `json:"DoNotTrack"`
}

type FeatureFlagsRequest struct {
	ProjectID          string            `json:"projectID"`
	UserOS             string            `json:"os"`
	UserOSVersion      string            `json:"osVersion"`
	UserDevice         string            `json:"device"`
	UserCountry        string            `json:"country"`
	UserState          string            `json:"state"`
	UserCity           string            `json:"city"`
	UserAgent          string            `json:"ua"`
	UserBrowser        string            `json:"browser"`
	UserBrowserVersion string            `json:"browserVersion"`
	UserDeviceType     string            `json:"deviceType"`
	Referrer           string            `json:"referrer"`
	UserID             string            `json:"userID"`
	Metadata           map[string]string `json:"metadata"`
	PersistFlags       map[string]string `json:"persistFlags"`
}

type FeatureFlagsResponse struct {
	Flags []interface{} `json:"flags"` // interface - flag{is_persist, value, payload}
}
