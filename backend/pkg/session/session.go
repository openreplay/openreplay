package session

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jellydator/ttlcache/v3"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/replays/service"
	"openreplay/backend/pkg/views"
)

type Service interface {
	GetReplay(projectID uint32, sessionID uint64, userID string) (*SessionReplay, error)
	IsExists(projectID uint32, sessionID uint64) (bool, error)
	GetSessionWindow(projectID uint32, sessionID uint64) (startTs int64, duration *int, found bool, err error)
	GetFileKey(sessID uint64) (*string, error)
}

type serviceImpl struct {
	log         logger.Logger
	conn        pool.Pool
	files       service.Files
	views       views.Views
	existsCache *ttlcache.Cache[sessionKey, bool]
	windowCache *ttlcache.Cache[sessionKey, sessionWindow]
}

type sessionKey struct {
	projectID uint32
	sessionID uint64
}

type sessionWindow struct {
	startTs  int64
	duration *int
}

// newTTLCache builds an in-memory cache. A TTL <= 0 disables caching (nil
// cache). TouchOnHit is disabled so entries expire a fixed TTL after they
// were stored, not after last use.
func newTTLCache[K comparable, V any](ttl time.Duration) *ttlcache.Cache[K, V] {
	if ttl <= 0 {
		return nil
	}
	c := ttlcache.New[K, V](
		ttlcache.WithTTL[K, V](ttl),
		ttlcache.WithDisableTouchOnHit[K, V](),
	)
	go c.Start() // evicts expired entries in the background
	return c
}

// NewService creates the session service. existsCacheTTL controls how long a
// positive IsExists answer is served from memory (SESSION_EXISTS_CACHE_TTL,
// default 1h); windowCacheTTL does the same for GetSessionWindow results
// (SESSION_WINDOW_CACHE_TTL, default 1m). A TTL <= 0 disables that cache.
func NewService(log logger.Logger, conn pool.Pool, views views.Views, files service.Files, existsCacheTTL, windowCacheTTL time.Duration) (Service, error) {
	return &serviceImpl{
		log:         log,
		conn:        conn,
		views:       views,
		files:       files,
		existsCache: newTTLCache[sessionKey, bool](existsCacheTTL),
		windowCache: newTTLCache[sessionKey, sessionWindow](windowCacheTTL),
	}, nil
}

// SessionReplay is filled from the GetReplay query via pgx struct scanning:
// the db tags map SELECT column names to fields; db:"-" fields are populated
// afterwards from the replay files service.
type SessionReplay struct {
	SessionID          string                 `json:"sessionId" db:"session_id"`
	ProjectID          uint32                 `json:"projectId" db:"project_id"`
	TrackerVersion     string                 `json:"trackerVersion" db:"tracker_version"`
	StartTs            int64                  `json:"startTs" db:"start_ts"`
	Duration           *int                   `json:"duration" db:"duration"`
	Platform           string                 `json:"platform" db:"platform"`
	UserID             *string                `json:"userId" db:"user_id"`
	UserUUID           string                 `json:"userUuid" db:"user_uuid"`
	UserOS             string                 `json:"userOs" db:"user_os"`
	UserOSVersion      *string                `json:"userOsVersion" db:"user_os_version"`
	UserBrowser        *string                `json:"userBrowser" db:"user_browser"`
	UserBrowserVersion *string                `json:"userBrowserVersion" db:"user_browser_version"`
	UserDevice         string                 `json:"userDevice" db:"user_device"`
	UserDeviceType     string                 `json:"userDeviceType" db:"user_device_type"`
	UserDeviceMemory   *int                   `json:"userDeviceMemorySize" db:"user_device_memory_size"`
	UserDeviceHeap     *int                   `json:"userDeviceHeapSize" db:"user_device_heap_size"`
	UserCountry        string                 `json:"userCountry" db:"user_country"`
	PagesCount         int                    `json:"pagesCount" db:"pages_count"`
	EventsCount        int                    `json:"eventsCount" db:"events_count"`
	IssueTypes         []string               `json:"issueTypes" db:"issue_types"`
	UtmSource          *string                `json:"utmSource" db:"utm_source"`
	UtmMedium          *string                `json:"utmMedium" db:"utm_medium"`
	UtmCampaign        *string                `json:"utmCampaign" db:"utm_campaign"`
	Referrer           *string                `json:"referrer" db:"referrer"`
	BaseReferrer       *string                `json:"baseReferrer" db:"base_referrer"`
	UserCity           *string                `json:"userCity" db:"user_city"`
	UserState          *string                `json:"userState" db:"user_state"`
	Timezone           *string                `json:"timezone" db:"timezone"`
	ScreenWidth        *int                   `json:"screenWidth" db:"screen_width"`
	ScreenHeight       *int                   `json:"screenHeight" db:"screen_height"`
	Favorite           bool                   `json:"favorite" db:"favorite"`
	Viewed             bool                   `json:"viewed" db:"viewed"`
	DomURL             []string               `json:"domURL" db:"-"`
	DevtoolsURL        []string               `json:"devtoolsURL" db:"-"`
	CanvasURL          []string               `json:"canvasURL" db:"-"`
	CanvasFrames       []string               `json:"canvasFrames" db:"-"`
	VideoURL           []string               `json:"videoURL" db:"-"`
	FramesURL          []string               `json:"mobileFrames" db:"-"`
	Metadata           map[string]interface{} `json:"metadata" db:"metadata_mapping"`
	Live               bool                   `json:"live" db:"-"`
	FileKey            *string                `json:"fileKey,omitempty" db:"-"`
}

const (
	NoSession string = "no session in db"
)

var ErrNoSession = errors.New(NoSession)

// FYI: full_data, include_fav_viewed and group_metadata are always True, so I didn't move it to Go
const getReplayQuery = `
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
	COALESCE(s.issue_types::text[], '{}') AS issue_types,
	s.utm_source,
	s.utm_medium,
	s.utm_campaign,
	s.referrer,
	s.base_referrer,
	s.timezone,
	s.screen_width,
	s.screen_height,
	EXISTS (SELECT 1
			FROM public.user_favorite_sessions fs
			WHERE fs.session_id = s.session_id
			  AND fs.user_id = $1) AS favorite,
	EXISTS (SELECT 1
			FROM public.user_viewed_sessions fs
			WHERE fs.session_id = s.session_id
			  AND fs.user_id = $1) AS viewed,
	COALESCE((SELECT jsonb_object_agg(k, v)
			  FROM (VALUES (p.metadata_1,  s.metadata_1),
						   (p.metadata_2,  s.metadata_2),
						   (p.metadata_3,  s.metadata_3),
						   (p.metadata_4,  s.metadata_4),
						   (p.metadata_5,  s.metadata_5),
						   (p.metadata_6,  s.metadata_6),
						   (p.metadata_7,  s.metadata_7),
						   (p.metadata_8,  s.metadata_8),
						   (p.metadata_9,  s.metadata_9),
						   (p.metadata_10, s.metadata_10)) AS pairs(k, v)
				WHERE k IS NOT NULL AND v IS NOT NULL
			  ),'{}'::jsonb) AS metadata_mapping
FROM public.sessions s
	 INNER JOIN public.projects p USING (project_id)
WHERE s.project_id = $2 AND s.session_id = $3;`

func (s *serviceImpl) GetReplay(projectID uint32, sessionID uint64, userID string) (*SessionReplay, error) {
	// Columns are mapped to SessionReplay fields by name via the db tags.
	rows, err := s.conn.Query(getReplayQuery, userID, projectID, sessionID)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	session, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByNameLax[SessionReplay])
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			return nil, ErrNoSession
		}
		return nil, fmt.Errorf("get session: %w", err)
	}
	si := &session

	// Get all pre-signed urls
	urls, err := s.files.GetMobsUrls(sessionID)
	if err != nil {
		return nil, err
	}
	si.DomURL = urls
	if si.Platform == "ios" || si.Platform == "android" || si.Platform == "mobile" {
		si.FramesURL, si.VideoURL, err = s.files.GetMobileReplayUrls(sessionID)
	} else {
		si.DevtoolsURL, err = s.files.GetDevtoolsUrls(sessionID)
		if err != nil {
			return nil, err
		}
		si.CanvasFrames, si.CanvasURL, err = s.files.GetCanvasUrls(sessionID)
		if err != nil {
			return nil, err
		}
	}

	go func() {
		viewCtx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", sessionID))
		viewCtx = context.WithValue(viewCtx, "projectID", fmt.Sprintf("%d", projectID))
		ctx, cancel := context.WithTimeout(viewCtx, 5*time.Second)
		defer cancel()
		if err := s.views.AddSessionView(ctx, projectID, sessionID, userID); err != nil {
			s.log.Error(ctx, "failed to add session view: %s", err)
		}
	}()

	return si, nil
}

func (s *serviceImpl) IsExists(projectID uint32, sessionID uint64) (bool, error) {
	key := sessionKey{projectID: projectID, sessionID: sessionID}
	if s.existsCache != nil {
		if item := s.existsCache.Get(key); item != nil {
			return true, nil
		}
	}

	sql := `SELECT EXISTS(SELECT 1 FROM public.sessions
        	WHERE session_id = $1 AND project_id = $2);`
	var exists bool
	if err := s.conn.QueryRow(sql, sessionID, projectID).Scan(&exists); err != nil {
		if err.Error() == "no rows in result set" {
			return false, nil // session does not exist
		}
		return false, fmt.Errorf("failed to check session existence: %w", err)
	}
	// Only positive answers are cached: a session that does not exist yet may
	// appear later, while an existing one never stops existing.
	if exists && s.existsCache != nil {
		s.existsCache.Set(key, true, ttlcache.DefaultTTL)
	}
	return exists, nil
}

func (s *serviceImpl) GetSessionWindow(projectID uint32, sessionID uint64) (int64, *int, bool, error) {
	key := sessionKey{projectID: projectID, sessionID: sessionID}
	if s.windowCache != nil {
		if item := s.windowCache.Get(key); item != nil {
			w := item.Value()
			return w.startTs, w.duration, true, nil
		}
	}

	sql := `SELECT start_ts, duration 
			FROM public.sessions
            WHERE session_id = $1 AND project_id = $2;`
	var startTs int64
	var duration *int
	if err := s.conn.QueryRow(sql, sessionID, projectID).Scan(&startTs, &duration); err != nil {
		if postgres.IsNoRowsErr(err) {
			return 0, nil, false, nil
		}
		return 0, nil, false, fmt.Errorf("failed to get session window: %s", err)
	}
	// Only found sessions are cached. The short TTL matters: duration is NULL
	// while a session is still live and is filled in once it ends.
	if s.windowCache != nil {
		s.windowCache.Set(key, sessionWindow{startTs: startTs, duration: duration}, ttlcache.DefaultTTL)
	}
	return startTs, duration, true, nil
}
