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
	fmt.Println(credentials)
	creds, ok := credentials.(sentryConfig)
	if !ok {
		return nil, fmt.Errorf("invalid credentials")
	}
	requestUrl := fmt.Sprintf("https://sentry.io/api/0/projects/%s/%s/events/", creds.OrganizationSlug, creds.ProjectSlug)

	if sessionID != 0 {
		params := url.Values{}
		params.Add("query", fmt.Sprintf("level:error openReplaySession.id:%d", sessionID))
		requestUrl += "?" + params.Encode()
	}

	// Create a new request
	req, err := http.NewRequest("GET", requestUrl, nil)
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}

	// Add Authorization header
	req.Header.Set("Authorization", "Bearer "+creds.Token)

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

	// Print the logs
	for _, event := range events {
		fmt.Printf("ID: %s, Title: %s, Message: %s, Environment: %s\n", event.ID, event.Title, event.Message, event.Environment)
	}
	return events, nil
}
