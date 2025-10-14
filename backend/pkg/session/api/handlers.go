package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	sessionCfg "openreplay/backend/internal/config/session"
	"openreplay/backend/pkg/assist/proxy"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/replays/service"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/session"
)

type handlersImpl struct {
	log           logger.Logger
	jsonSizeLimit int64
	responser     api.Responser
	sessions      session.Service
	assist        proxy.Assist
	files         service.Files
}

func NewHandlers(log logger.Logger, cfg *sessionCfg.Config, responser api.Responser, sessions session.Service, assist proxy.Assist, files service.Files) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		jsonSizeLimit: cfg.JsonSizeLimit,
		responser:     responser,
		sessions:      sessions,
		assist:        assist,
		files:         files,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/{project}/assist/sessions", "POST", e.getLiveSessions, api.NoPermissions, api.DoNotTrack}, // have a key access [ee]
		{"/v1/{project}/assist/sessions/{session}", "GET", e.getLiveSession, []string{"ASSIST_LIVE", "SERVICE_ASSIST_LIVE"}, api.DoNotTrack},
		{"/v1/{project}/sessions/{session}/replay", "GET", e.getReplay, []string{"SESSION_REPLAY", "SERVICE_SESSION_REPLAY"}, api.DoNotTrack},
	}
}

func (e *handlersImpl) getReplay(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projID, err := api.GetProject(r)
	if err != nil {
		e.log.Error(r.Context(), "Error getting project ID: %v", err)
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("wrong project id"), time.Now(), r.URL.Path, 0)
		return
	}

	sessID, err := api.GetSessionID(r)
	if err != nil {
		e.log.Error(r.Context(), "Error getting session ID: %v", err)
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("wrong session id"), time.Now(), r.URL.Path, 0)
		return
	}
	currUser := api.GetUser(r)
	response := map[string]interface{}{"data": nil}

	data, err := e.sessions.GetReplay(projID, sessID, currUser.GetIDAsString())

	if err != nil {
		if strings.Contains(err.Error(), session.NoSession) {
			data, err := e.assist.GetLiveSessionByID(projID, sessID)
			if err != nil {
				e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, time.Now(), r.URL.Path, 0)
				return
			}
			response["data"] = data
		} else {
			// FYI: this is a direct copy of the chalice’s logic for compatibility support.
			e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"errors": []string{"session not found"}}, startTime, r.URL.Path, bodySize)
			return
		}
	} else {
		data.Live, err = e.assist.IsLive(projID, sessID)
		if err != nil {
			e.log.Error(r.Context(), "Error getting live session: %v", err)
		}

		fileKey, err := e.files.GetFileKey(sessID)
		if err != nil {
			e.log.Error(r.Context(), "Error getting file key: %v", err)
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("error retrieving file key"), startTime, r.URL.Path, bodySize)
			return
		}
		if fileKey != nil {
			data.FileKey = fileKey
		}

		response["data"] = data
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, response, startTime, r.URL.Path, bodySize)
}

/*
{
    "filters": [
        {
            "type": "userCountry",
            "isEvent": false,
            "value": [
                "FR"
            ],
            "operator": "is",
            "filters": []
        },
        {
            "type": "userBrowser",
            "isEvent": false,
            "value": [
                "Chrome",
                "Safari"
            ],
            "operator": "is",
            "filters": []
        }
    ],
    "sort": "startTs", // + metadata
    "order": "desc",
    "limit": 10,
    "page": 1
}
*/

/*
userOs
userBrowser
userDevice
userCountry
userCity
userState
userId
userAnonymousId
revId
platform
pageTitle
sessionId
metadata
userUuid
trackerVersion
userBrowserVersion
userDeviceType
*/

// the original method: get_live_sessions_ws
func (e *handlersImpl) getLiveSessions(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &proxy.GetLiveSessionsRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	projID, err := api.GetProject(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp, err := e.assist.GetLiveSessionsWS(projID, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
	return
}

func (e *handlersImpl) getLiveSession(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projID, err := api.GetProject(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	sessionID, err := api.GetSessionID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	data, err := e.assist.GetLiveSessionByID(projID, sessionID)
	if err != nil {
		currUser := api.GetUser(r)

		data, err = e.sessions.GetReplay(projID, sessionID, currUser.GetIDAsString())
		if err != nil {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
			return
		}
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": data}, startTime, r.URL.Path, bodySize)
	return
}

/*
	{
	    "data": {
	        "sessionId": "3175576139223984677",
	        "projectId": 65,
	        "trackerVersion": "15.0.3",
	        "startTs": 1739279087735,
	        "duration": 14613,
	        "platform": "web",
	        "userId": "",
	        "userUuid": "3b323077-6f0c-46f9-be73-253b3cfe80b5",
	        "userOs": "Windows",
	        "userOsVersion": "10",
	        "userBrowser": "Chrome",
	        "userBrowserVersion": "132.0.0",
	        "userDevice": "",
	        "userDeviceType": "desktop",
	        "userDeviceMemorySize": 8192,
	        "userDeviceHeapSize": 4294705152,
	        "userCountry": "UN",
	        "pagesCount": 1,
	        "eventsCount": 2,
	        "issueScore": 1739279087,
	        "issueTypes": "{}",
	        "utmSource": null,
	        "utmMedium": null,
	        "utmCampaign": null,
	        "referrer": null,
	        "baseReferrer": null,
	        "userCity": null,
	        "userState": null,
	        "timezone": "UTC+01:00",
	        "screenWidth": 1920,
	        "screenHeight": 1080,
	        "favorite": false,
	        "viewed": false,
	        "devtoolsURL": [
	            "https://foss.openreplay.com/mobs/3175576139223984677/devtools.mob?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=d66bed3c1afb9dbd7cf7%2F20250211%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250211T131042Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=4a50341d763ae8a3adfc976c69e8954e07df596c45aa23ea1cde02a68cbe9166"
	        ],
	        "canvasURL": [],
	        "domURL": [
	            "https://foss.openreplay.com/mobs/3175576139223984677/dom.mobs?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=d66bed3c1afb9dbd7cf7%2F20250211%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250211T131042Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=d2ef727bbf4e8648b7542fb5b4e0e4caebe390b9dc02eeb74c3ab244e289e9c2",
	            "https://foss.openreplay.com/mobs/3175576139223984677/dom.mobe?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=d66bed3c1afb9dbd7cf7%2F20250211%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250211T131042Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=30062c6e512d7410760f3df9f24aa731220be58cf9618c823c0bb3ff9f6409dc"
	        ],
	        "metadata": {},
	        "live": false
	    }
	}
*/
