package proxy

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"openreplay/backend/internal/config/session"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
)

type Assist interface {
	GetLiveSessionByID(projID uint32, sessID uint64) (interface{}, error)
	GetLiveSessionsWS(projID uint32, req *GetLiveSessionsRequest) (interface{}, error)
	IsLive(projID uint32, sessID uint64) (bool, error)
}

type assistImpl struct {
	cfg      *session.Config
	log      logger.Logger
	projects projects.Projects
}

func New(log logger.Logger, cfg *session.Config, projects projects.Projects) (Assist, error) {
	switch {
	case log == nil:
		return nil, errors.New("logger is nil")
	case cfg == nil:
		return nil, errors.New("config is nil")
	case projects == nil:
		return nil, errors.New("projects is nil")
	}
	return &assistImpl{
		log:      log,
		cfg:      cfg,
		projects: projects,
	}, nil
}

// assist.get_live_session_by_id(project_id=project_id, session_id=session_id)
func (a *assistImpl) GetLiveSessionByID(projID uint32, sessID uint64) (interface{}, error) {
	switch {
	case projID == 0:
		return nil, errors.New("projID is 0")
	case sessID == 0:
		return nil, errors.New("sessID is 0")
	}

	proj, err := a.projects.GetProject(projID)
	if err != nil {
		return nil, err
	}
	assistUrl := fmt.Sprintf(a.cfg.AssistUrl, a.cfg.AssistKey) + a.cfg.AssistLiveSuffix + "/" + proj.ProjectKey + "/" + strconv.Itoa(int(sessID))

	resp, err := http.Get(assistUrl)
	if err != nil {
		fmt.Println("Error making request:", err)
		return nil, err
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading response:", err)
		return nil, err
	}

	// Parse the JSON response
	type assistResponse struct {
		Data map[string]interface{} `json:"data"`
	}
	var response assistResponse
	err = json.Unmarshal(body, &response)
	if err != nil {
		fmt.Println("Error parsing JSON response:", err)
		return nil, err
	}
	if response.Data == nil {
		response.Data = make(map[string]interface{})
	}

	response.Data["live"] = true
	if token, err := a.getAgentToken(projID, proj.ProjectKey, sessID); err != nil {
		a.log.Error(context.Background(), "[proxy] GetLiveSessionByID: ", err)
	} else {
		response.Data["agentToken"] = token
	}
	return response.Data, nil
}

func (a *assistImpl) getAgentToken(projectID uint32, projectKey string, sessionID uint64) (string, error) {
	var method jwt.SigningMethod
	switch a.cfg.AssistJwtAlgorithm {
	case "HS256":
		method = jwt.SigningMethodHS256
	case "HS384":
		method = jwt.SigningMethodHS384
	case "HS512":
		method = jwt.SigningMethodHS512
	default:
		return "", errors.New("unsupported JWT_ALGORITHM: " + a.cfg.AssistJwtAlgorithm)
	}

	// iat in seconds since epoch (UTC), like iat // 1000 in Python
	iat := time.Now().UTC().Unix()
	// local UTC offset in seconds (TimeUTC.get_utc_offset() // 1000 in Python)
	_, offsetSeconds := time.Now().Zone()
	exp := iat + a.cfg.AssistJwtExpiration + int64(offsetSeconds)

	claims := jwt.MapClaims{
		"projectKey": projectKey,
		"projectId":  projectID,
		"sessionId":  fmt.Sprintf("%d", sessionID),
		"iat":        iat,
		"exp":        exp,
		"iss":        a.cfg.AssistJwtIssuer,
		"aud":        "openreplay:agent",
	}

	token := jwt.NewWithClaims(method, claims)
	signed, err := token.SignedString([]byte(a.cfg.AssistJwtSecret))
	if err != nil {
		return "", err
	}
	return signed, nil
}

// assist.get_live_sessions_ws(...)
func (a *assistImpl) GetLiveSessionsWS(projID uint32, req *GetLiveSessionsRequest) (interface{}, error) {
	switch {
	case projID == 0:
		return nil, errors.New("projID is 0")
	case req == nil:
		return nil, errors.New("request body is nil")
	}

	proj, err := a.projects.GetProject(projID)
	if err != nil {
		return nil, err
	}
	assistUrl := fmt.Sprintf(a.cfg.AssistUrl, a.cfg.AssistKey) + a.cfg.AssistLiveSuffix + "/" + proj.ProjectKey

	// Transformation from frontend request to assist request payload
	payload, err := json.Marshal(req.Parse())
	if err != nil {
		return nil, err
	}

	resp, err := a.requestAssistData(assistUrl, payload)
	if err != nil {
		a.log.Error(context.Background(), "Error requesting assist data: %v", err)
		resp = map[string]interface{}{"total": 0, "sessions": []interface{}{}} // default response
	}
	return resp, nil
}

// assist.is_live(project_id=project_id, session_id=session_id, project_key=data["projectKey"])
func (a *assistImpl) IsLive(projID uint32, sessID uint64) (bool, error) {
	switch {
	case projID == 0:
		return false, errors.New("projID is 0")
	case sessID == 0:
		return false, errors.New("sessID is 0")
	}
	proj, err := a.projects.GetProject(projID)
	if err != nil {
		return false, err
	}
	assistUrl := fmt.Sprintf(a.cfg.AssistUrl, a.cfg.AssistKey) + a.cfg.AssistListSuffix + "/" + proj.ProjectKey + "/" + strconv.Itoa(int(sessID))
	resp, err := http.Get(assistUrl)
	if err != nil {
		fmt.Println("error making request:", err)
		return false, err
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("error reading response:", err)
		return false, err
	}

	// Parse the JSON response
	var responseData map[string]interface{}
	err = json.Unmarshal(body, &responseData)
	if err != nil {
		fmt.Println("error parsing JSON response:", err)
		return false, err
	}
	return false, nil
}

type GetLiveSessionsRequest struct {
	Filters []interface{} `json:"filters"`
	Sort    string        `json:"sort"`  // "userId", "timestamp" default
	Order   string        `json:"order"` // "asc" or "desc", default "desc"
	Limit   int           `json:"limit"` // default 10
	Page    int           `json:"page"`  // default 1
}

type GetAssistSessionsPayload struct {
	Filter     map[string]interface{} `json:"filter"`
	Pagination map[string]int         `json:"pagination"`
	Sort       map[string]string      `json:"sort"`
}

func (r *GetLiveSessionsRequest) Parse() *GetAssistSessionsPayload {
	if r == nil {
		return nil
	}
	res := &GetAssistSessionsPayload{
		Filter:     make(map[string]interface{}),
		Pagination: map[string]int{"limit": r.Limit, "page": r.Page},
		Sort:       map[string]string{"key": r.Sort, "order": r.Order},
	}
	for _, filter := range r.Filters {
		switch f := filter.(type) {
		case map[string]interface{}:
			filterType := f["type"].(string)
			if filterType == "metadata" {
				filterType = f["source"].(string)
			}
			res.Filter[filterType] = map[string]interface{}{"values": f["value"], "operator": f["operator"]}
		}
	}
	return res
}

/*
The list of fields we have to return:
active
metadata
sessionID
timestamp
userBrowser
userCity
userCountry
userDevice
userDeviceType
userID
userOs
userState
userUUID
*/

func (a *assistImpl) requestAssistData(assistURL string, payload []byte) (interface{}, error) {
	assistReq, err := http.NewRequest("POST", assistURL, bytes.NewBuffer(payload))
	if err != nil {
		fmt.Println("Error creating request:", err)
		return nil, err
	}
	assistReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: a.cfg.AssistRequestTimeout,
	}
	resp, err := client.Do(assistReq)
	if err != nil {
		fmt.Println("Error sending request:", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("HTTP error: %d %s\n", resp.StatusCode, http.StatusText(resp.StatusCode))
		return nil, err
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading response body:", err)
		return nil, err
	}

	// Parse the JSON response
	var responseData map[string]interface{}
	err = json.Unmarshal(body, &responseData)
	if err != nil {
		fmt.Println("Error parsing JSON response:", err)
		return nil, err
	}

	return responseData, nil
}
