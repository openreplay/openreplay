package clients

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/elastic/go-elasticsearch/v8"
)

type elasticsearchClient struct{}

func NewElasticClient() Client {
	return &elasticsearchClient{}
}

type elasticsearchConfig struct {
	URL      string `json:"url"`
	APIKeyId string `json:"api_key_id"`
	APIKey   string `json:"api_key"`
	Indexes  string `json:"indexes"`
}

func (e *elasticsearchClient) FetchSessionData(credentials interface{}, sessionID uint64) (interface{}, error) {
	creds, ok := credentials.(elasticsearchConfig)
	if !ok {
		return nil, fmt.Errorf("invalid credentials")
	}
	cfg := elasticsearch.Config{
		Addresses: []string{
			creds.URL,
		},
		APIKey: base64.StdEncoding.EncodeToString([]byte(creds.APIKeyId + ":" + creds.APIKey)),
	}

	// Create Elasticsearch client
	es, err := elasticsearch.NewClient(cfg)
	if err != nil {
		log.Fatalf("Error creating the client: %s", err)
	}

	var buf strings.Builder
	query := `{}`
	if sessionID != 0 {
		query = fmt.Sprintf(`{
			"query": {
				"match": {
					"message": "openReplaySession.id=%d"
				}
			}
		}`, sessionID)
	}
	buf.WriteString(query)

	res, err := es.Search(
		es.Search.WithContext(context.Background()),
		es.Search.WithIndex("logs"),
		es.Search.WithBody(strings.NewReader(buf.String())),
		es.Search.WithTrackTotalHits(true),
	)
	if err != nil {
		log.Fatalf("Error getting response: %s", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		log.Fatalf("Error: %s", res.String())
	}

	var r map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&r); err != nil {
		log.Fatalf("Error parsing the response body: %s", err)
	}

	fmt.Printf("Total hits: %d\n", int(r["hits"].(map[string]interface{})["total"].(map[string]interface{})["value"].(float64)))

	for _, hit := range r["hits"].(map[string]interface{})["hits"].([]interface{}) {
		doc := hit.(map[string]interface{})["_source"]
		fmt.Printf("Log: %s\n", doc)
	}
	return nil, nil
}
