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
	cfg, ok := credentials.(sentryConfig)
	if !ok {
		strCfg, ok := credentials.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("invalid credentials")
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
		cfg.URL = "https://sentry.io" // Default to hosted Sentry if not specified
	}
	requestUrl := fmt.Sprintf("%s/api/0/projects/%s/%s/issues/", cfg.URL, cfg.OrganizationSlug, cfg.ProjectSlug)

	testCallLimit := 1
	params := url.Values{}
	if sessionID != 0 {
		params.Add("query", fmt.Sprintf("openReplaySession.id:%d", sessionID))
	} else {
		params.Add("per_page", fmt.Sprintf("%d", testCallLimit))
	}
	requestUrl += "?" + params.Encode()

	// Create a new request
	req, err := http.NewRequest("GET", requestUrl, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	// Add Authorization header
	req.Header.Set("Authorization", "Bearer "+cfg.Token)

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	// Check if the response status is OK
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch logs, status code: %v", resp.StatusCode)
	}

	// Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}

	// Parse the JSON response
	var events []SentryEvent
	err = json.Unmarshal(body, &events)
	if err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %v", err)
	}
	if events == nil || len(events) == 0 {
		return nil, fmt.Errorf("no logs found")
	}

	result, err := json.Marshal(events)
	if err != nil {
		return nil, err
	}
	return result, nil
}
