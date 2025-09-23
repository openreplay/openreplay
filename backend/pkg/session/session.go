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
	IssueScore         int                    `json:"issueScore"`
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
}

var metadataColumns = []string{"metadata_1", "metadata_2", "metadata_3", "metadata_4", "metadata_5",
	"metadata_6", "metadata_7", "metadata_8", "metadata_9", "metadata_10"}

const (
	NoSession string = "no session in db"
)

// FYI: full_data, include_fav_viewed and group_metadata are always True, so I didn't move it to Go
func (s *serviceImpl) GetReplay(projectID uint32, sessionID uint64, userID string) (*SessionReplay, error) {
	// prepare metadata columns (can be done once, because it's the same for all sessions)
	metadataColumnsSQL := ""
	for i := 0; i < 10; i++ {
		metadataColumnsSQL += fmt.Sprintf("'%s', p.%s,", metadataColumns[i], metadataColumns[i])
	}
	metadataColumnsSQL = metadataColumnsSQL[:len(metadataColumnsSQL)-1]

	// prepare sql request
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
	    s.issue_score,
	    s.issue_types,
	    s.utm_source,
	    s.utm_medium,
	    s.utm_campaign,
	    s.referrer,
	    s.base_referrer,
	    s.timezone,
	    s.screen_width,
	    s.screen_height,
		COALESCE((SELECT TRUE
              FROM public.user_favorite_sessions AS fs
              WHERE s.session_id = fs.session_id
              AND fs.user_id = :user_id), FALSE) AS favorite,
	    COALESCE((SELECT TRUE
              FROM public.user_viewed_sessions AS fs
              WHERE s.session_id = fs.session_id
              AND fs.user_id = :user_id), FALSE) AS viewed,
		(
		  SELECT jsonb_object_agg(key, value)
		  FROM (
			SELECT p.metadata_1 AS key, s.metadata_1 AS value WHERE p.metadata_1 IS NOT NULL AND s.metadata_1 IS NOT NULL
			UNION ALL
			SELECT p.metadata_2, s.metadata_2 WHERE p.metadata_2 IS NOT NULL AND s.metadata_2 IS NOT NULL
			UNION ALL
			SELECT p.metadata_3, s.metadata_3 WHERE p.metadata_3 IS NOT NULL AND s.metadata_3 IS NOT NULL
			UNION ALL
			SELECT p.metadata_4, s.metadata_4 WHERE p.metadata_4 IS NOT NULL AND s.metadata_4 IS NOT NULL
			UNION ALL
			SELECT p.metadata_5, s.metadata_5 WHERE p.metadata_5 IS NOT NULL AND s.metadata_5 IS NOT NULL
			UNION ALL
			SELECT p.metadata_6, s.metadata_6 WHERE p.metadata_6 IS NOT NULL AND s.metadata_6 IS NOT NULL
			UNION ALL
			SELECT p.metadata_7, s.metadata_7 WHERE p.metadata_7 IS NOT NULL AND s.metadata_7 IS NOT NULL
			UNION ALL
			SELECT p.metadata_8, s.metadata_8 WHERE p.metadata_8 IS NOT NULL AND s.metadata_8 IS NOT NULL
			UNION ALL
			SELECT p.metadata_9, s.metadata_9 WHERE p.metadata_9 IS NOT NULL AND s.metadata_9 IS NOT NULL
			UNION ALL
			SELECT p.metadata_10, s.metadata_10 WHERE p.metadata_10 IS NOT NULL AND s.metadata_10 IS NOT NULL
		  ) AS metadata_pairs
		) AS metadata_mapping
	    FROM public.sessions AS s
		INNER JOIN public.projects AS p USING (project_id)
		WHERE s.project_id = :project_id AND s.session_id = :session_id;
	`

	// Replace all placeholders with actual values
	sqlRequest = strings.ReplaceAll(sqlRequest, ":metadata_columns", metadataColumnsSQL)
	sqlRequest = strings.ReplaceAll(sqlRequest, ":user_id", userID)
	sqlRequest = strings.ReplaceAll(sqlRequest, ":project_id", strconv.Itoa(int(projectID)))
	sqlRequest = strings.ReplaceAll(sqlRequest, ":session_id", strconv.Itoa(int(sessionID)))

	// Scan everything into a struct
	si := &SessionReplay{}
	if err := s.conn.QueryRow(sqlRequest).Scan(
		&si.SessionID, &si.ProjectID, &si.TrackerVersion, &si.StartTs, &si.Duration, &si.Platform, &si.UserID, &si.UserUUID,
		&si.UserOS, &si.UserOSVersion, &si.UserBrowser, &si.UserBrowserVersion, &si.UserDevice, &si.UserDeviceType,
		&si.UserDeviceMemory, &si.UserDeviceHeap, &si.UserCountry, &si.UserCity, &si.UserState, &si.PagesCount,
		&si.EventsCount, &si.IssueScore, &si.IssueTypes, &si.UtmSource, &si.UtmMedium, &si.UtmCampaign, &si.Referrer,
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
	query := `SELECT platform FROM public.sessions WHERE project_id = $1 AND session_id = $2`
	var platform string
	if err := s.conn.QueryRow(query, projectID, sessionID).Scan(&platform); err != nil {
		return "", err
	}
	return platform, nil
}
