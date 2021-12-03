package main

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/token"
	. "openreplay/backend/pkg/messages"
)

func startSessionHandlerWeb(w http.ResponseWriter, r *http.Request) {
	type request struct {
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
	}
	type response struct {
		Timestamp int64  			`json:"timestamp"`
		Delay     int64  			`json:"delay"`
		Token     string 			`json:"token"`
		UserUUID  string 			`json:"userUUID"`
		SessionID string 			`json:"sessionID"`
		BeaconSizeLimit int64 `json:"beaconSizeLimit"`
	}

	startTime := time.Now()
	req := &request{}
	body := http.MaxBytesReader(w, r.Body, JSON_SIZE_LIMIT) // what if Body == nil??  // use r.ContentLength to return specific error?
	//defer body.Close()
	if err := json.NewDecoder(body).Decode(req); err != nil {
		responseWithError(w, http.StatusBadRequest, err)
		return
	}

	if req.ProjectKey == nil {
		responseWithError(w, http.StatusForbidden, errors.New("ProjectKey value required"))
		return
	}

	p, err := pgconn.GetProjectByKey(*req.ProjectKey)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			responseWithError(w, http.StatusNotFound, errors.New("Project doesn't exist or capture limit has been reached"))
		} else {
			responseWithError(w, http.StatusInternalServerError, err) // TODO: send error here only on staging
		}
		return
	}

	userUUID := getUUID(req.UserUUID)
	tokenData, err := tokenizer.Parse(req.Token)
	if err != nil || req.Reset { // Starting the new one
		dice := byte(rand.Intn(100)) // [0, 100)
		if dice >= p.SampleRate {
			responseWithError(w, http.StatusForbidden, errors.New("cancel"))
			return
		}

		ua := uaParser.ParseFromHTTPRequest(r)
		if ua == nil {
			responseWithError(w, http.StatusForbidden, errors.New("browser not recognized"))
			return
		}
		sessionID, err := flaker.Compose(uint64(startTime.UnixNano() / 1e6))
		if err != nil {
			responseWithError(w, http.StatusInternalServerError, err)
			return
		}
		// TODO: if EXPIRED => send message for two sessions association
		expTime := startTime.Add(time.Duration(p.MaxSessionDuration) * time.Millisecond)
		tokenData = &token.TokenData{sessionID, expTime.UnixNano() / 1e6}

		country := geoIP.ExtractISOCodeFromHTTPRequest(r)
		producer.Produce(TOPIC_RAW_WEB, tokenData.ID, Encode(&SessionStart{
			Timestamp:            req.Timestamp,
			ProjectID:            uint64(p.ProjectID),
			TrackerVersion:       req.TrackerVersion,
			RevID:                req.RevID,
			UserUUID:             userUUID,
			UserAgent:            r.Header.Get("User-Agent"),
			UserOS:               ua.OS,
			UserOSVersion:        ua.OSVersion,
			UserBrowser:          ua.Browser,
			UserBrowserVersion:   ua.BrowserVersion,
			UserDevice:           ua.Device,
			UserDeviceType:       ua.DeviceType,
			UserCountry:          country,
			UserDeviceMemorySize: req.DeviceMemory,
			UserDeviceHeapSize:   req.JsHeapSizeLimit,
		}))
	}

	//delayDuration := time.Now().Sub(startTime)
	responseWithJSON(w, &response{
		//Timestamp: startTime.UnixNano() / 1e6,
		//Delay:     delayDuration.Nanoseconds() / 1e6,
		Token:     tokenizer.Compose(*tokenData),
		UserUUID:  userUUID,
		SessionID: strconv.FormatUint(tokenData.ID, 10),
		BeaconSizeLimit: BEACON_SIZE_LIMIT,
	})
}

func pushMessagesHandlerWeb(w http.ResponseWriter, r *http.Request) {
	sessionData, err := tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		responseWithError(w, http.StatusUnauthorized, err)
		return
	}
	body := http.MaxBytesReader(w, r.Body, BEACON_SIZE_LIMIT)
	//defer body.Close()
	buf, err := ioutil.ReadAll(body)
	if err != nil {
		responseWithError(w, http.StatusInternalServerError, err) // TODO: send error here only on staging
		return
	}
	//log.Printf("Sending batch...")
	//startTime := time.Now()

	//	analyticsMessages := make([]Message, 0, 200)

	rewritenBuf, err := RewriteBatch(buf, func(msg Message) Message {
		switch m := msg.(type) {
		case *SetNodeAttributeURLBased:
			if m.Name == "src" || m.Name == "href" {
				msg = &SetNodeAttribute{
					ID:    m.ID,
					Name:  m.Name,
					Value: handleURL(sessionData.ID, m.BaseURL, m.Value),
				}
			} else if m.Name == "style" {
				msg = &SetNodeAttribute{
					ID:    m.ID,
					Name:  m.Name,
					Value: handleCSS(sessionData.ID, m.BaseURL, m.Value),
				}
			}
		case *SetCSSDataURLBased:
			msg = &SetCSSData{
				ID:   m.ID,
				Data: handleCSS(sessionData.ID, m.BaseURL, m.Data),
			}
		case *CSSInsertRuleURLBased:
			msg = &CSSInsertRule{
				ID:    m.ID,
				Index: m.Index,
				Rule:  handleCSS(sessionData.ID, m.BaseURL, m.Rule),
			}
		}

		// switch msg.(type) {
		// case *BatchMeta, // TODO: watchout! Meta().Index'es are changed here (though it is still unique for the topic-session pair)
		// 	*SetPageLocation,
		// 	*PageLoadTiming,
		// 	*PageRenderTiming,
		// 	*PerformanceTrack,
		// 	*SetInputTarget,
		// 	*SetInputValue,
		// 	*MouseClick,
		// 	*RawErrorEvent,
		// 	*JSException,
		// 	*ResourceTiming,
		// 	*RawCustomEvent,
		// 	*CustomIssue,
		// 	*Fetch,
		// 	*StateAction,
		// 	*GraphQL,
		// 	*CreateElementNode,
		// 	*CreateTextNode,
		// 	*RemoveNode,
		// 	*CreateDocument,
		// 	*RemoveNodeAttribute,
		// 	*MoveNode,
		// 	*SetCSSData,
		// 	*CSSInsertRule,
		// 	*CSSDeleteRule:
		// 	analyticsMessages = append(analyticsMessages, msg)
		//}

		return msg
	})
	if err != nil {
		responseWithError(w, http.StatusForbidden, err)
		return
	}
	producer.Produce(TOPIC_RAW_WEB, sessionData.ID, rewritenBuf)
	//producer.Produce(TOPIC_ANALYTICS, sessionData.ID, WriteBatch(analyticsMessages))
	//duration := time.Now().Sub(startTime)
	//log.Printf("Sended batch within %v nsec; %v nsek/byte", duration.Nanoseconds(), duration.Nanoseconds()/int64(len(buf)))
	w.WriteHeader(http.StatusOK)
}

func notStartedHandlerWeb(w http.ResponseWriter, r *http.Request) {
	type request struct {
		ProjectKey     *string `json:"projectKey"`
		TrackerVersion string  `json:"trackerVersion"`
		DoNotTrack     bool    `json:"DoNotTrack"`
		// RevID                string `json:"revID"`
	}
	req := &request{}
	body := http.MaxBytesReader(w, r.Body, JSON_SIZE_LIMIT)
	defer body.Close()
	if err := json.NewDecoder(body).Decode(req); err != nil {
		responseWithError(w, http.StatusBadRequest, err)
		return
	}
	if req.ProjectKey == nil {
		responseWithError(w, http.StatusForbidden, errors.New("ProjectKey value required"))
		return
	}
	ua := uaParser.ParseFromHTTPRequest(r) // TODO?: insert anyway
	if ua == nil {
		responseWithError(w, http.StatusForbidden, errors.New("browser not recognized"))
		return
	}
	country := geoIP.ExtractISOCodeFromHTTPRequest(r)
	err := pgconn.InsertUnstartedSession(postgres.UnstartedSession{
		ProjectKey:         *req.ProjectKey,
		TrackerVersion:     req.TrackerVersion,
		DoNotTrack:         req.DoNotTrack,
		Platform:           "web",
		UserAgent:          r.Header.Get("User-Agent"),
		UserOS:             ua.OS,
		UserOSVersion:      ua.OSVersion,
		UserBrowser:        ua.Browser,
		UserBrowserVersion: ua.BrowserVersion,
		UserDevice:         ua.Device,
		UserDeviceType:     ua.DeviceType,
		UserCountry:        country,
	})
	if err != nil {
		log.Printf("Unable to insert Unstarted Session: %v\n", err)
	}
	w.WriteHeader(http.StatusOK)
}