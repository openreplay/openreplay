package session

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/replays/service"
	"openreplay/backend/pkg/views"
)

type Service interface {
	GetReplay(projectID uint32, sessionID uint64, userID string) (*SessionReplay, error)
	IsExists(projectID uint32, sessionID uint64) (bool, error)
	GetPlatform(projectID uint32, sessionID uint64) (string, error)
	GetFileKey(sessID uint64) (*string, error)
}

type serviceImpl struct {
	log   logger.Logger
	conn  pool.Pool
	files service.Files
	views views.Views
}

func NewService(log logger.Logger, conn pool.Pool, views views.Views, files service.Files) (Service, error) {
	return &serviceImpl{
		log:   log,
		conn:  conn,
		views: views,
		files: files,
	}, nil
}

type SessionReplay struct {
	SessionID          string                 `json:"sessionId"`
	ProjectID          uint32                 `json:"projectId"`
	TrackerVersion     string                 `json:"trackerVersion"`
	StartTs            int64                  `json:"startTs"`
	Duration           *int                   `json:"duration"`
	Platform           string                 `json:"platform"`
	UserID             *string                `json:"userId"`
	UserUUID           string                 `json:"userUuid"`
	UserOS             string                 `json:"userOs"`
	UserOSVersion      *string                `json:"userOsVersion"`
	UserBrowser        *string                `json:"userBrowser"`
	UserBrowserVersion *string                `json:"userBrowserVersion"`
	UserDevice         string                 `json:"userDevice"`
	UserDeviceType     string                 `json:"userDeviceType"`
	UserDeviceMemory   *int                   `json:"userDeviceMemorySize"`
	UserDeviceHeap     *int                   `json:"userDeviceHeapSize"`
	UserCountry        string                 `json:"userCountry"`
	PagesCount         int                    `json:"pagesCount"`
	EventsCount        int                    `json:"eventsCount"`
	IssueTypes         string                 `json:"issueTypes"`
	UtmSource          *string                `json:"utmSource"`
	UtmMedium          *string                `json:"utmMedium"`
	UtmCampaign        *string                `json:"utmCampaign"`
	Referrer           *string                `json:"referrer"`
	BaseReferrer       *string                `json:"baseReferrer"`
	UserCity           *string                `json:"userCity"`
	UserState          *string                `json:"userState"`
	Timezone           *string                `json:"timezone"`
	ScreenWidth        *int                   `json:"screenWidth"`
	ScreenHeight       *int                   `json:"screenHeight"`
	Favorite           bool                   `json:"favorite"`
	Viewed             bool                   `json:"viewed"`
	DomURL             []string               `json:"domURL"`
	DevtoolsURL        []string               `json:"devtoolsURL"`
	CanvasURL          []string               `json:"canvasURL"`
	VideoURL           []string               `json:"videoURL"`
	Metadata           map[string]interface{} `json:"metadata"`
	Live               bool                   `json:"live"`
	FileKey            *string                `json:"fileKey"`
}

const (
	NoSession string = "no session in db"
)

// FYI: full_data, include_fav_viewed and group_metadata are always True, so I didn't move it to Go
func (s *serviceImpl) GetReplay(projectID uint32, sessionID uint64, userID string) (*SessionReplay, error) {
	sqlRequest := `
	SELECT
	    s.session_id::text AS session_id,
	    s.project_id,
	    s.tracker_version,
	    s.start_ts,
	    s.duration,
	    s.platform,
	    s.user_id,
	    s.user_uuid,
	    s.user_os,
	    s.user_os_version,
	    s.user_browser,
	    s.user_browser_version,
	    s.user_device,
	    s.user_device_type,
	    s.user_device_memory_size,
	    s.user_device_heap_size,
	    s.user_country,
	    s.user_city,
	    s.user_state,
	    s.pages_count,
	    s.events_count,
	    s.issue_types,
	    s.utm_source,
	    s.utm_medium,
	    s.utm_campaign,
	    s.referrer,
	    s.base_referrer,
	    s.timezone,
	    s.screen_width,
	    s.screen_height,
		EXISTS (
			SELECT 1
			FROM public.user_favorite_sessions fs
			WHERE fs.session_id = s.session_id
			  AND fs.user_id = :user_id
		) AS favorite,
	
		EXISTS (
			SELECT 1
			FROM public.user_viewed_sessions fs
			WHERE fs.session_id = s.session_id
			  AND fs.user_id = :user_id
		) AS viewed,

		COALESCE(
				(
					SELECT jsonb_object_agg(k, v)
					FROM (
							 VALUES
								 (p.metadata_1,  s.metadata_1),
								 (p.metadata_2,  s.metadata_2),
								 (p.metadata_3,  s.metadata_3),
								 (p.metadata_4,  s.metadata_4),
								 (p.metadata_5,  s.metadata_5),
								 (p.metadata_6,  s.metadata_6),
								 (p.metadata_7,  s.metadata_7),
								 (p.metadata_8,  s.metadata_8),
								 (p.metadata_9,  s.metadata_9),
								 (p.metadata_10, s.metadata_10)
						 ) AS pairs(k, v)
					WHERE k IS NOT NULL AND v IS NOT NULL
				),
				'{}'::jsonb
		) AS metadata_mapping
	
	FROM public.sessions s
         JOIN public.projects p USING (project_id)
	WHERE s.project_id = :project_id AND s.session_id = :session_id;
	`

	// Replace all placeholders with actual values
	sqlRequest = strings.ReplaceAll(sqlRequest, ":user_id", userID)
	sqlRequest = strings.ReplaceAll(sqlRequest, ":project_id", strconv.Itoa(int(projectID)))
	sqlRequest = strings.ReplaceAll(sqlRequest, ":session_id", strconv.Itoa(int(sessionID)))

	// Scan everything into a struct
	si := &SessionReplay{}
	if err := s.conn.QueryRow(sqlRequest).Scan(
		&si.SessionID, &si.ProjectID, &si.TrackerVersion, &si.StartTs, &si.Duration, &si.Platform, &si.UserID, &si.UserUUID,
		&si.UserOS, &si.UserOSVersion, &si.UserBrowser, &si.UserBrowserVersion, &si.UserDevice, &si.UserDeviceType,
		&si.UserDeviceMemory, &si.UserDeviceHeap, &si.UserCountry, &si.UserCity, &si.UserState, &si.PagesCount,
		&si.EventsCount, &si.IssueTypes, &si.UtmSource, &si.UtmMedium, &si.UtmCampaign, &si.Referrer,
		&si.BaseReferrer, &si.Timezone, &si.ScreenWidth, &si.ScreenHeight, &si.Favorite, &si.Viewed, &si.Metadata); err != nil {
		return nil, fmt.Errorf(NoSession+", %s", err)
	}

	// Get all pre-signed urls
	urls, err := s.files.GetMobsUrls(sessionID)
	if err != nil {
		return nil, err
	}
	si.DomURL = urls
	if si.Platform == "ios" || si.Platform == "android" || si.Platform == "mobile" {
		si.VideoURL, err = s.files.GetMobileReplayUrls(sessionID)
	} else {
		si.DevtoolsURL, err = s.files.GetDevtoolsUrls(sessionID)
		if err != nil {
			return nil, err
		}
		si.CanvasURL, err = s.files.GetCanvasUrls(sessionID)
		if err != nil {
			return nil, err
		}
	}

	if err := s.views.AddSessionView(projectID, sessionID, userID); err != nil {
		s.log.Error(context.Background(), "failed to add session view", err)
	}

	return si, nil
}

func (s *serviceImpl) IsExists(projectID uint32, sessionID uint64) (bool, error) {
	sql := `SELECT EXISTS(SELECT 1 FROM public.sessions
        	WHERE session_id = $1 AND project_id = $2);`
	var exists bool
	if err := s.conn.QueryRow(sql, sessionID, projectID).Scan(&exists); err != nil {
		if err.Error() == "no rows in result set" {
			return false, nil // session does not exist
		}
		return false, fmt.Errorf("failed to check session existence: %w", err)
	}
	return exists, nil
}

func (s *serviceImpl) GetPlatform(projectID uint32, sessionID uint64) (string, error) {
	query := `SELECT platform FROM public.projects WHERE project_id = $1`
	var platform string
	if err := s.conn.QueryRow(query, projectID).Scan(&platform); err != nil {
		return "", err
	}
	return platform, nil
}
