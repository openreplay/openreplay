package integration

import (
	"bytes"
	"context"
	b64 "encoding/base64"
	"encoding/json"
	"fmt"
	elasticlib "github.com/elastic/go-elasticsearch/v7"
	"log"
	"strconv"
	"time"

	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/utime"
)

type elasticsearch struct {
	Host     string
	Port     json.Number
	ApiKeyId string //`json:"api_key_id"`
	ApiKey   string //`json:"api_key"`
	Indexes  string
}

type elasticsearchLog struct {
	Message string
	Time    time.Time `json:"utc_time"` // Should be parsed automatically from RFC3339
}

func (es *elasticsearch) Request(c *client) error {
	address := es.Host + ":" + es.Port.String()
	apiKey := b64.StdEncoding.EncodeToString([]byte(es.ApiKeyId + ":" + es.ApiKey))
	cfg := elasticlib.Config{
		Addresses: []string{
			address,
		},
		//Username: es.ApiKeyId,
		//Password: es.ApiKey,
		APIKey: apiKey,
	}
	esC, err := elasticlib.NewClient(cfg)

	if err != nil {
		log.Println("Error while creating new ES client")
		log.Println(err)
		return err
	}

	gteTs := c.getLastMessageTimestamp() + 1000 // Sec or millisec to add ?
	log.Printf("gteTs: %v ", gteTs)
	var buf bytes.Buffer
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					map[string]interface{}{
						"match": map[string]interface{}{
							"message": map[string]interface{}{
								"query": "openReplaySessionToken=", // asayer_session_id=
							},
						},
					},
					map[string]interface{}{
						"range": map[string]interface{}{
							"utc_time": map[string]interface{}{
								"gte": strconv.FormatUint(gteTs, 10),
								"lte": "now",
							},
						},
					},
					map[string]interface{}{
						"term": map[string]interface{}{
							"tags": "error",
						},
					},
				},
			},
		},
	}

	if err := json.NewEncoder(&buf).Encode(query); err != nil {
		return fmt.Errorf("Error encoding the query: %s", err)
	}

	res, err := esC.Search(
		esC.Search.WithContext(context.Background()),
		esC.Search.WithIndex(es.Indexes),
		esC.Search.WithSize(1000),
		esC.Search.WithScroll(time.Minute*2),
		esC.Search.WithBody(&buf),
		esC.Search.WithSort("utc_time:asc"),
	)
	if err != nil {
		return fmt.Errorf("Error getting response: %s", err)
	}
	defer res.Body.Close()
	if res.IsError() {
		var e map[string]interface{}
		if err := json.NewDecoder(res.Body).Decode(&e); err != nil {
			log.Printf("Error parsing the Error response body: %v\n", err)
			return fmt.Errorf("Error parsing the Error response body: %v", err)
		} else {
			log.Printf("Elasticsearch Error [%s] %s: %s\n",
				res.Status(),
				e["error"],
				e["error"],
			)
			return fmt.Errorf("Elasticsearch Error [%s] %s: %s",
				res.Status(),
				e["error"],
				e["error"],
			)
		}
	}

	for {
		var esResp map[string]interface{}
		if err := json.NewDecoder(res.Body).Decode(&esResp); err != nil {
			return fmt.Errorf("Error parsing the response body: %s", err)
			// If no error, then convert response to a map[string]interface
		}

		if _, ok := esResp["hits"]; !ok {
			log.Printf("Hits not found in \n%v\n", esResp)
			break
		}
		hits := esResp["hits"].(map[string]interface{})["hits"].([]interface{})
		if len(hits) == 0 {
			log.Println("No hits found")
			break
		}
		for _, hit := range hits {

			// Parse the attributes/fields of the document
			doc := hit.(map[string]interface{})
			source := doc["_source"].(map[string]interface{})

			if _, ok := esResp["message"]; !ok {
				log.Printf("message not found in doc \n%v\n", doc)
				c.errChan <- fmt.Errorf("message not found in doc '%v' ", doc)
				continue
			}

			if _, ok := esResp["utc_time"]; !ok {
				log.Printf("utc_time not found in doc \n%v\n", doc)
				c.errChan <- fmt.Errorf("utc_time not found in doc '%v' ", doc)
				continue
			}

			parsedTime, err := time.Parse(time.RFC3339, source["utc_time"].(string))
			if err != nil {
				log.Println("cannot parse time")
				c.errChan <- fmt.Errorf("cannot parse RFC3339 time of doc '%v' ", doc)
				continue
			}
			esLog := elasticsearchLog{Message: source["message"].(string), Time: parsedTime}
			docID := doc["_id"]

			token, err := GetToken(esLog.Message)
			if err != nil {
				log.Printf("Error generating token: %s\n", err)
				c.errChan <- err
				continue
			}
			timestamp := uint64(utime.ToMilliseconds(esLog.Time))
			c.setLastMessageTimestamp(timestamp)
			c.evChan <- &SessionErrorEvent{
				//SessionID: sessionID,
				Token: token,
				RawErrorEvent: &messages.RawErrorEvent{
					Source:    "elasticsearch",
					Timestamp: timestamp,
					Name: fmt.Sprintf("%v", docID),
					Payload: fmt.Sprintf("%v", source),
				},
			}
		}
		if _, ok := esResp["_scroll_id"]; !ok {
			log.Println("_scroll_id not found")
			break
		}
		log.Println("Scrolling")
		scrollId := esResp["_scroll_id"]
		res, err = esC.Scroll(
			esC.Scroll.WithContext(context.Background()),
			esC.Scroll.WithScrollID(fmt.Sprintf("%v", scrollId)),
			esC.Scroll.WithScroll(time.Minute*2),
		)
		if err != nil {
			return fmt.Errorf("Error getting scroll response: %s", err)
		}
		defer res.Body.Close()
		if res.IsError() {
			var e map[string]interface{}
			if err := json.NewDecoder(res.Body).Decode(&e); err != nil {
				return fmt.Errorf("Error parsing the response body: %v", err)
			} else {
				return fmt.Errorf("Elasticsearch [%s] %s: %s",
					res.Status(),
					e["error"], //.(map[string]interface{})["type"],
					e["error"], //.(map[string]interface{})["reason"],
				)
			}
		}
	}
	return nil
}
