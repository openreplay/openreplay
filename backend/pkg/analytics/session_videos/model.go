package session_videos

type SessionVideo struct {
	VideoID      string `json:"videoId"`
	SessionID    string `json:"sessionId"`
	ProjectID    int    `json:"projectId"`
	UserID       uint64 `json:"userId"`
	FileURL      string `json:"fileUrl"`
	Status       string `json:"status"`
	JobID        string `json:"jobId,omitempty"`
	ErrorMessage string `json:"errorMessage,omitempty"`
	CreatedAt    int64  `json:"createdAt"`
	ModifiedAt   int64  `json:"modifiedAt"`
}

type SessionVideoExportRequest struct {
	SessionID string `json:"sessionId" validate:"required"`
	ProjectID int    `json:"projectId" validate:"required"`
}

type SessionVideoExportResponse struct {
	Status  string `json:"status"`
	JobID   string `json:"jobId"`
	FileURL string `json:"fileUrl,omitempty"`
}

type GetSessionVideosResponse struct {
	Videos []SessionVideo `json:"videos"`
	Total  int            `json:"total"`
}

type PageInfo struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

type SessionVideosGetRequest struct {
	PageInfo
	SortBy string `json:"sortBy" validate:"omitempty,oneof=datetime"`
	Asc    bool   `json:"asc"`
	IsSelf bool   `json:"isSelf"`
	Status string `json:"status" validate:"omitempty,oneof=pending completed failed"`
}
