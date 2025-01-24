package web

type StartSessionRequest struct {
	Token           string  `json:"token"`
	UserUUID        *string `json:"userUUID"`
	RevID           string  `json:"revID"`
	Timestamp       int64   `json:"timestamp"`
	Timezone        string  `json:"timezone"`
	TrackerVersion  string  `json:"trackerVersion"`
	IsSnippet       bool    `json:"isSnippet"`
	DeviceMemory    uint64  `json:"deviceMemory"`
	JsHeapSizeLimit uint64  `json:"jsHeapSizeLimit"`
	ProjectKey      *string `json:"projectKey"`
	Reset           bool    `json:"reset"`
	UserID          string  `json:"userID"`
	DoNotRecord     bool    `json:"doNotRecord"` // start record session or not
	BufferDiff      uint64  `json:"bufferDiff"`  // buffer diff in ms for start record session
	IsOffline       bool    `json:"isOffline"`   // to indicate that we have to use user's start timestamp
	Condition       string  `json:"condition"`   // condition for start record session
	Width           int     `json:"width"`
	Height          int     `json:"height"`
}

type StartSessionResponse struct {
	Timestamp            int64           `json:"timestamp"`
	StartTimestamp       int64           `json:"startTimestamp"`
	Delay                int64           `json:"delay"`
	Token                string          `json:"token"`
	UserUUID             string          `json:"userUUID"`
	UserOS               string          `json:"userOS"`
	UserDevice           string          `json:"userDevice"`
	UserBrowser          string          `json:"userBrowser"`
	UserCountry          string          `json:"userCountry"`
	UserState            string          `json:"userState"`
	UserCity             string          `json:"userCity"`
	SessionID            string          `json:"sessionID"`
	ProjectID            string          `json:"projectID"`
	BeaconSizeLimit      int64           `json:"beaconSizeLimit"`
	CompressionThreshold int64           `json:"compressionThreshold"`
	CanvasEnabled        bool            `json:"canvasEnabled"` // false default
	CanvasImageQuality   string          `json:"canvasQuality"` // low | medium | high
	CanvasFrameRate      int             `json:"canvasFPS"`     // 2 default
	Features             map[string]bool `json:"features"`
}

func recordSession(req *StartSessionRequest) bool {
	return !req.DoNotRecord
}

func modifyResponse(req *StartSessionRequest, res *StartSessionResponse) {}
