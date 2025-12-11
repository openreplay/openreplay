package clients

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type dynatraceClient struct{}

func NewDynatraceClient() Client {
	return &dynatraceClient{}
}

type dynatraceConfig struct {
	Environment  string `json:"environment"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	Resource     string `json:"resource"`
}

type AuthToken struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

func (d *dynatraceClient) FetchSessionData(credentials interface{}, sessionID uint64) (interface{}, error) {
	// Try to parse the credentials as a Config struct
	cfg, ok := credentials.(dynatraceConfig)
	if !ok {
		strCfg, ok := credentials.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("invalid credentials")
		}
		cfg = dynatraceConfig{}
		if val, ok := strCfg["environment"].(string); ok {
			cfg.Environment = val
		}
		if val, ok := strCfg["client_id"].(string); ok {
			cfg.ClientID = val
		}
		if val, ok := strCfg["client_secret"].(string); ok {
			cfg.ClientSecret = val
		}
		if val, ok := strCfg["resource"].(string); ok {
			cfg.Resource = val
		}
	}
	token, err := d.requestOAuthToken(cfg.ClientID, cfg.ClientSecret, cfg.Resource)
	if err != nil {
		return nil, fmt.Errorf("error while requesting oauth token: %w", err)
	}
	logs, err := d.requestLogs(token.AccessToken, cfg.Environment, sessionID)
	if err != nil {
		return nil, fmt.Errorf("error while requesting logs: %w", err)
	}
	return logs, nil
}

func (d *dynatraceClient) requestOAuthToken(clientID, clientSecret, resource string) (*AuthToken, error) {
	requestURL := "https://sso.dynatrace.com/sso/oauth2/token"
	params := url.Values{}
	params.Add("grant_type", "client_credentials")
	params.Add("client_id", clientID)
	params.Add("client_secret", clientSecret)
	params.Add("resource", resource)
	params.Add("scope", "storage:buckets:read storage:logs:read")
	requestURL += "?" + params.Encode()
	request, err := http.NewRequest("POST", requestURL, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}
	newToken := &AuthToken{}

	err = json.Unmarshal(body, newToken)
	if err != nil {
		return nil, err
	}
	if newToken.AccessToken == "" {
		return nil, fmt.Errorf("empty access token, body: %s", string(body))
	}
	return newToken, nil
}

type Logs struct {
	Results []interface{} `json:"results"`
}

func testRequestParams() url.Values {
	params := url.Values{}
	params.Add("limit", "1")
	return params
}

func requestParams(sessionID uint64) url.Values {
	params := url.Values{}
	params.Add("limit", "1000")
	params.Add("query", "(status=\"WARN\" OR status=\"ERROR\") AND openReplaySession.id="+fmt.Sprint(sessionID))
	return params
}

func (d *dynatraceClient) requestLogs(token, environmentID string, sessionID uint64) (interface{}, error) {
	requestURL := fmt.Sprintf("https://%s.live.dynatrace.com/api/v2/logs/search", environmentID)
	if sessionID == 0 {
		requestURL += "?" + testRequestParams().Encode()
	} else {
		requestURL += "?" + requestParams(sessionID).Encode()
	}

	request, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	logs := &Logs{}
	err = json.Unmarshal(body, logs)
	if err != nil {
		return nil, err
	}
	if len(logs.Results) == 0 {
		return nil, fmt.Errorf("empty logs, body: %s", string(body))
	}
	responseContent, _ := json.Marshal(logs.Results)
	return responseContent, nil
}
