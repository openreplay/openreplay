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
	UserOS               string `json:"userOS"`
	UserDevice           string `json:"userDevice"`
	UserBrowser          string `json:"userBrowser"`
	UserCountry          string `json:"userCountry"`
	UserState            string `json:"userState"`
	UserCity             string `json:"userCity"`
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
