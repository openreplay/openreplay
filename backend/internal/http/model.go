package http

type StartSessionRequest struct {
	Token           string  `json:"token"`
	UserUUID        *string `json:"userUUID"`
	RevID           string  `json:"revID"`
	Timestamp       uint64  `json:"timestamp"`
	TrackerVersion  string  `json:"trackerVersion"`
	IsSnippet       bool    `json:"isSnippet"`
	DeviceMemory    uint64  `json:"deviceMemory"`
	JsHeapSizeLimit uint64  `json:"jsHeapSizeLimit"`
	ProjectKey      *string `json:"projectKey"`
	Reset           bool    `json:"reset"`
	UserID          string  `json:"userID"`
}

type StartSessionResponse struct {
	Timestamp       int64  `json:"timestamp"`
	Delay           int64  `json:"delay"`
	Token           string `json:"token"`
	UserUUID        string `json:"userUUID"`
	SessionID       string `json:"sessionID"`
	BeaconSizeLimit int64  `json:"beaconSizeLimit"`
}

type NotStartedRequest struct {
	ProjectKey     *string `json:"projectKey"`
	TrackerVersion string  `json:"trackerVersion"`
	DoNotTrack     bool    `json:"DoNotTrack"`
}
