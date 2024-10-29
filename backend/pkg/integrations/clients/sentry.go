package clients

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
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
			return nil, fmt.Errorf("invalid credentials, got: %+v", credentials)
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
		return nil, fmt.Errorf("invalid credentials")
	}
	requestUrl := fmt.Sprintf("https://sentry.io/api/0/projects/%s/%s/events/", cfg.OrganizationSlug, cfg.ProjectSlug)

	testCallLimit := 1
	params := url.Values{}
	if sessionID != 0 {
		params.Add("query", fmt.Sprintf("openReplaySession.id=%d", sessionID))
	} else {
		params.Add("per_page", fmt.Sprintf("%d", testCallLimit))
	}
	requestUrl += "?" + params.Encode()

	// Create a new request
	req, err := http.NewRequest("GET", requestUrl, nil)
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}

	// Add Authorization header
	req.Header.Set("Authorization", "Bearer "+cfg.Token)

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Failed to send request: %v", err)
	}
	defer resp.Body.Close()

	// Check if the response status is OK
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Failed to fetch logs, status code: %v", resp.StatusCode)
	}

	// Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response body: %v", err)
	}

	// Parse the JSON response
	var events []SentryEvent
	err = json.Unmarshal(body, &events)
	if err != nil {
		log.Fatalf("Failed to parse JSON: %v", err)
	}
	if events == nil || len(events) == 0 {
		return nil, fmt.Errorf("no logs found")
	}

	// Print the logs
	for _, event := range events {
		fmt.Printf("ID: %s, Title: %s, Message: %s, Environment: %s\n", event.ID, event.Title, event.Message, event.Environment)
	}
	result, err := json.Marshal(events)
	if err != nil {
		return nil, err
	}
	return result, nil
}
