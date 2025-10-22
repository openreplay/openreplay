package service

import "fmt"

type Status string

const (
	StatusPending   Status = "pending"
	StatusFailed    Status = "failure"
	StatusCompleted Status = "success"
)

type SessionVideo struct {
	SessionID    string `json:"sessionId"`
	ProjectID    int    `json:"projectId"`
	UserID       uint64 `json:"userId"`
	UserName     string `json:"userName"`
	FileURL      string `json:"fileUrl"`
	Status       Status `json:"status"`
	JobID        string `json:"jobId,omitempty"`
	ErrorMessage string `json:"errorMessage,omitempty"`
	CreatedAt    int64  `json:"createdAt"`
	ModifiedAt   int64  `json:"modifiedAt"`
}

func (video *SessionVideo) Response() *SessionVideoExportResponse {
	response := &SessionVideoExportResponse{
		Status: video.Status,
		JobID:  video.JobID,
	}
	if video.FileURL != "" {
		response.FileURL = video.FileURL
	}
	return response
}

type SessionVideoExportRequest struct {
	SessionID string `json:"sessionId" validate:"required"`
}

type SessionVideoExportResponse struct {
	Status  Status `json:"status"`
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
	Status Status `json:"status" validate:"omitempty,oneof=pending success failure"`
}

type SessionVideoJobMessage struct {
	Status    Status `json:"status"`
	Name      string `json:"name"` // s3Path
	Error     string `json:"error,omitempty"`
	SessionId string `json:"sessionId"`
}

var (
	ErrSessionNotFound       = fmt.Errorf("session not found")
	ErrUnableToVerifySession = fmt.Errorf("unable to verify session")
	ErrVideoNotFound         = fmt.Errorf("session video not found")
	ErrVideoNotReady         = fmt.Errorf("session video is not ready for download yet")
	ErrFileNotAvailable      = fmt.Errorf("session video file is not available")
	ErrDownloadUnavailable   = fmt.Errorf("download service is temporarily unavailable")
	ErrUnableToGenerateLink  = fmt.Errorf("unable to generate download link")
	ErrAuthenticationFailed  = fmt.Errorf("authentication failed, please try again")
)
