package logger

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/getsentry/sentry-go"
	"net/http"
	"openreplay/backend/pkg/env"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esapi"
)

type extraLogger struct {
	hasSentry     bool
	hasElastic    bool
	dataDogAPIKey string
	elasticLogger *elasticsearch.Client
}

type ExtraLogger interface {
	Log(ctx context.Context, log string)
}

func NewExtraLogger() ExtraLogger {
	// Init sentry
	hasSentry := true
	SENTRY_DSN := env.String("SENTRY_DSN")
	err := sentry.Init(sentry.ClientOptions{
		Dsn:              SENTRY_DSN,
		TracesSampleRate: 1.0,
	})
	if err != nil {
		fmt.Printf("sentry.Init: %s", err)
		hasSentry = false
	}

	// Init elasticsearch
	ELASTIC_HOST := env.String("ELASTIC_HOST")
	ELASTIC_API_KEY := env.String("ELASTIC_API_KEY")

	hasElastic := true
	es, err := elasticsearch.NewClient(elasticsearch.Config{
		Addresses: []string{ELASTIC_HOST},
		APIKey:    ELASTIC_API_KEY,
	})
	if err != nil {
		fmt.Printf("Error creating the ES client: %s", err)
		hasElastic = false
	}

	// Init
	DATADOG_API_KEY := env.String("DATADOG_API_KEY")
	if DATADOG_API_KEY == "" {
		fmt.Printf("DATADOG_API_KEY is empty")
	}

	return &extraLogger{
		hasSentry:     hasSentry,
		hasElastic:    hasElastic,
		elasticLogger: es,
		dataDogAPIKey: DATADOG_API_KEY,
	}
}

// LogMessage defines the structure of your log message
type LogMessage struct {
	Timestamp time.Time `json:"@timestamp"`
	Message   string    `json:"message"`
	Level     string    `json:"level"`
}

func sendLog(es *elasticsearch.Client, logMessage LogMessage) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(logMessage); err != nil {
		fmt.Printf("Error encoding log message: %s", err)
		return
	}

	req := esapi.IndexRequest{
		Index:      "logs",
		DocumentID: "",
		Body:       &buf,
		Refresh:    "true",
	}

	res, err := req.Do(context.Background(), es)
	if err != nil {
		fmt.Printf("Error sending log to Elasticsearch: %s", err)
		return
	}
	defer res.Body.Close()

	// Check the response status
	if res.IsError() {
		fmt.Printf("Error response from Elasticsearch: %s", res.String())
	} else {
		fmt.Printf("Log successfully sent to Elasticsearch.")
	}
}

func (el *extraLogger) Log(ctx context.Context, msg string) {
	if sID, ok := ctx.Value("sessionID").(string); ok {
		msg = fmt.Sprintf("%s openReplaySession.id=%s", msg, sID)
	}
	if el.hasSentry {
		sentry.CaptureMessage(msg)
	}
	if el.hasElastic {
		esMsg := LogMessage{
			Timestamp: time.Now(),
			Message:   msg,
			Level:     "INFO",
		}
		sendLog(el.elasticLogger, esMsg)
	}
	if el.dataDogAPIKey != "" {
		url := "https://http-intake.logs.datadoghq.com/v1/input"

		logMessage := `{
        "message": "` + msg + `",
        "ddsource": "go",
        "service": "myservice",
        "hostname": "myhost",
        "ddtags": "env:development"
    }`

		req, err := http.NewRequest("POST", url, bytes.NewBuffer([]byte(logMessage)))
		if err != nil {
			fmt.Println("Failed to create request:", err)
			return
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("DD-API-KEY", el.dataDogAPIKey)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			fmt.Println("Failed to send log to DataDog:", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			fmt.Println("Failed to send log to DataDog, status code:", resp.StatusCode)
		} else {
			fmt.Println("Log sent to DataDog successfully!")
		}
	}
}
