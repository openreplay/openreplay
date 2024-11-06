package mobile

type StartMobileSessionRequest struct {
	Token          string  `json:"token"`
	ProjectKey     *string `json:"projectKey"`
	TrackerVersion string  `json:"trackerVersion"`
	RevID          string  `json:"revID"`
	UserUUID       *string `json:"userUUID"`
	UserOSVersion  string  `json:"userOSVersion"`
	UserDevice     string  `json:"userDevice"`
	UserDeviceType string  `json:"userDeviceType"`
	Timestamp      uint64  `json:"timestamp"`
	Timezone       string  `json:"timezone"`
	DeviceMemory   uint64  `json:"deviceMemory"`
	DoNotRecord    bool    `json:"doNotRecord"` // start record session or not
	Condition      string  `json:"condition"`   // condition for start record session
	Platform       string  `json:"platform"`
	Width          int     `json:"width"`
	Height         int     `json:"height"`
}

type StartMobileSessionResponse struct {
	Token           string          `json:"token"`
	ImagesHashList  []string        `json:"imagesHashList"`
	UserUUID        string          `json:"userUUID"`
	BeaconSizeLimit int64           `json:"beaconSizeLimit"`
	SessionID       string          `json:"sessionID"`
	ImageQuality    string          `json:"quality"`
	FrameRate       int             `json:"fps"`
	ProjectID       string          `json:"projectID"`
	Features        map[string]bool `json:"features"`
}
