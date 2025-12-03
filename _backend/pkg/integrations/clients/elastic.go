package clients

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
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
	cfg, ok := credentials.(elasticsearchConfig)
	if !ok {
		strCfg, ok := credentials.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("invalid credentials")
		}
		cfg = elasticsearchConfig{}
		if val, ok := strCfg["url"].(string); ok {
			cfg.URL = val
		}
		if val, ok := strCfg["api_key_id"].(string); ok {
			cfg.APIKeyId = val
		}
		if val, ok := strCfg["api_key"].(string); ok {
			cfg.APIKey = val
		}
		if val, ok := strCfg["indexes"].(string); ok {
			cfg.Indexes = val
		}
	}
	clientCfg := elasticsearch.Config{
		Addresses: []string{
			cfg.URL,
		},
		APIKey: base64.StdEncoding.EncodeToString([]byte(cfg.APIKeyId + ":" + cfg.APIKey)),
	}

	// Create Elasticsearch client
	es, err := elasticsearch.NewClient(clientCfg)
	if err != nil {
		return nil, fmt.Errorf("error creating the client: %s", err)
	}

	var buf strings.Builder
	query := `{"size": 1}`
	if sessionID != 0 {
		query = fmt.Sprintf(`{
			"size": 1000,
			"query": {
				"match_phrase": {
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
		return nil, fmt.Errorf("error getting response: %s", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("error: %s", res.String())
	}

	var r map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&r); err != nil {
		return nil, fmt.Errorf("error parsing the response body: %s", err)
	}
	if r["hits"] == nil {
		return nil, fmt.Errorf("no logs found")
	}
	logHits := r["hits"].(map[string]interface{})["hits"].([]interface{})
	if logHits == nil || len(logHits) == 0 {
		return nil, fmt.Errorf("no logs found")
	}
	responseContent, _ := json.Marshal(logHits)
	return responseContent, nil
}
