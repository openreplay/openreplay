package router

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
	CanvasEnabled        bool   `json:"canvasEnabled"` // false default
	CanvasImageQuality   string `json:"canvasQuality"` // low | medium | high
	CanvasFrameRate      int    `json:"canvasFPS"`     // 2 default
}

type NotStartedRequest struct {
	ProjectKey     *string `json:"projectKey"`
	TrackerVersion string  `json:"trackerVersion"`
	DoNotTrack     bool    `json:"DoNotTrack"`
}

type StartIOSSessionRequest struct {
	Token          string  `json:"token"`
	ProjectKey     *string `json:"projectKey"`
	TrackerVersion string  `json:"trackerVersion"`
	RevID          string  `json:"revID"`
	UserUUID       *string `json:"userUUID"`
	UserOSVersion  string  `json:"userOSVersion"`
	UserDevice     string  `json:"userDevice"`
	Timestamp      uint64  `json:"timestamp"`
	Timezone       string  `json:"timezone"`
	DeviceMemory   uint64  `json:"deviceMemory"`
}

type StartIOSSessionResponse struct {
	Token           string   `json:"token"`
	ImagesHashList  []string `json:"imagesHashList"`
	UserUUID        string   `json:"userUUID"`
	BeaconSizeLimit int64    `json:"beaconSizeLimit"`
	SessionID       string   `json:"sessionID"`
	ImageQuality    string   `json:"quality"`
	FrameRate       int      `json:"fps"`
}
