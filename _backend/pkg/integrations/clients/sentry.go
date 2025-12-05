package clients

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type sentryClient struct {
	//
}

func NewSentryClient() Client {
	return &sentryClient{}
}

type sentryConfig struct {
	OrganizationSlug string `json:"organization_slug"`
	ProjectSlug      string `json:"project_slug"`
	Token            string `json:"token"`
	URL              string `json:"url"`
}

type SentryEvent struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Message     string `json:"message"`
	Environment string `json:"environment"`
}

func (s *sentryClient) FetchSessionData(credentials interface{}, sessionID uint64) (interface{}, error) {
	cfg, err := parseSentryConfig(credentials)
	if err != nil {
		return nil, err
	}
	// Fetch sentry events
	requestUrl := prepareURLWithParams(cfg, sessionID, true)
	list, err := makeRequest(cfg, requestUrl)
	if err != nil {
		return nil, err
	}
	if list == nil || len(list) == 0 {
		// Fetch sentry issues if no events found
		requestUrl = prepareURLWithParams(cfg, sessionID, false)
		list, err = makeRequest(cfg, requestUrl)
		if err != nil {
			return nil, err
		}
		if list == nil || len(list) == 0 {
			return nil, fmt.Errorf("no logs found")
		}
	}
	result, err := json.Marshal(list)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func parseSentryConfig(credentials interface{}) (sentryConfig, error) {
	cfg, ok := credentials.(sentryConfig)
	if !ok {
		strCfg, ok := credentials.(map[string]interface{})
		if !ok {
			return cfg, fmt.Errorf("invalid credentials")
		}
		cfg = sentryConfig{}
		if val, ok := strCfg["organization_slug"].(string); ok {
			cfg.OrganizationSlug = val
		}
		if val, ok := strCfg["project_slug"].(string); ok {
			cfg.ProjectSlug = val
		}
		if val, ok := strCfg["token"].(string); ok {
			cfg.Token = val
		}
		if val, ok := strCfg["url"].(string); ok {
			cfg.URL = val
		}
	}
	if cfg.URL == "" {
		cfg.URL = "https://sentry.io"
	}
	return cfg, nil
}

func prepareURLWithParams(cfg sentryConfig, sessionID uint64, isEvents bool) string {
	entities := "issues"
	if isEvents {
		entities = "events"
	}
	requestUrl := fmt.Sprintf("%s/api/0/projects/%s/%s/%s/", cfg.URL, cfg.OrganizationSlug, cfg.ProjectSlug, entities)
	params := url.Values{}
	querySign := ":"
	if isEvents {
		querySign = "="
	}
	if sessionID != 0 {
		params.Add("query", fmt.Sprintf("openReplaySession.id%s%d", querySign, sessionID))
	} else {
		params.Add("per_page", "1")
	}
	return requestUrl + "?" + params.Encode()
}

func makeRequest(cfg sentryConfig, requestUrl string) ([]SentryEvent, error) {
	req, err := http.NewRequest("GET", requestUrl, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+cfg.Token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch logs, status code: %v", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}

	var events []SentryEvent
	err = json.Unmarshal(body, &events)
	if err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %v", err)
	}
	return events, nil
}
