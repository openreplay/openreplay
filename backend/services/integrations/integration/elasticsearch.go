package integration

import (
	"bytes"
	"context"
	b64 "encoding/base64"
	"encoding/json"
	"fmt"
	elasticlib "github.com/elastic/go-elasticsearch/v7"
	"log"
	"reflect"
	"strings"
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

type elasticResponce struct {
	Hits struct {
		//Total struct {
		//	Value int
		//}
		Hits []struct {
			Id     string          `json:"_id"`
			Source json.RawMessage `json:"_source"`
		}
	}
	ScrollId string `json:"_scroll_id"`
}
var mapResp map[string]interface{}
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
	log.Print("creating new ES client\n")
	esC, err := elasticlib.NewClient(cfg)

	if err != nil {
		return err
	}
	log.Printf("ES client created using User name and password")
	log.Printf(apiKey)
	// TODO: ping/versions/ client host check
	//  res0, err := esC.Info()
	// if err != nil {
	//     log.Printf("ELASTIC Error getting info: %s", err)
	//  }
	//  defer res0.Body.Close()
	//  // Check response status
	//  if res0.IsError() {
	//    log.Printf("ELASTIC Error: %s", res0.String())
	//  }
	//  log.Printf("ELASTIC  Info: %v ", res0.String())

	gteTs := c.getLastMessageTimestamp() + 1000 // Sec or millisec to add ?
	log.Printf("gteTs: %v ", gteTs)
	var buf bytes.Buffer
	//query := map[string]interface{}{
	//	"query": map[string]interface{}{
	//		"bool": map[string]interface{}{
	//			"filter": []map[string]interface{}{
	//				map[string]interface{}{
	//					"match": map[string]interface{}{
	//						"message": map[string]interface{}{
	//							"query": "openReplaySessionToken=", // asayer_session_id=
	//						},
	//					},
	//				},
	//				map[string]interface{}{
	//					"range": map[string]interface{}{
	//						"utc_time": map[string]interface{}{
	//							"gte": strconv.FormatUint(gteTs, 10),
	//							"lte": "now",
	//						},
	//					},
	//				},
	//				map[string]interface{}{
	//					"term": map[string]interface{}{
	//						"tags": "error",
	//					},
	//				},
	//			},
	//		},
	//	},
	//}
	query := `{ "query": { "bool": { "filter": [ { "match": { "message": { "query": "openReplaySessionToken=" } } }, { "range": { "utc_time": { "gte": 1643231522874, "lte": "now" } } }, { "term": { "tags": "error" } } ] } } }`
	var b strings.Builder
	b.WriteString(query)
	read := strings.NewReader(b.String())
	if err := json.NewEncoder(&buf).Encode(read); err != nil {
		return fmt.Errorf("Error encoding the query: %s", err)
	}
	log.Print("looking for logs in index:")
	log.Print(es.Indexes)
	log.Print("QUERY:")
	log.Print(query)
	res, err := esC.Search(
		esC.Search.WithContext(context.Background()),
		esC.Search.WithIndex(es.Indexes),
		esC.Search.WithSize(1000),
		esC.Search.WithScroll(time.Minute*2),
		esC.Search.WithBody(read),
		esC.Search.WithSort("timestamp:asc"),
	)
	log.Print("after looking for logs")
	if err != nil {
		return fmt.Errorf("Error getting response: %s", err)
	}
	defer res.Body.Close()
	//if res.IsError() {
	//	var e map[string]interface{}
	//	if err := json.NewDecoder(res.Body).Decode(&e); err != nil {
	//		return fmt.Errorf("Error parsing the response body: %v", err)
	//	} else {
	//		return fmt.Errorf("Elasticsearch [%s] %s: %s",
	//			res.Status(),
	//			e["error"], //.(map[string]interface{})["type"],
	//			e["error"], //.(map[string]interface{})["reason"],
	//		)
	//	}
	//}
	log.Print("no errors while looking for logs")
	for {
		if err := json.NewDecoder(res.Body).Decode(&mapResp); err != nil {
			log.Fatalf("Error parsing the response body: %s", err)

			// If no error, then convert response to a map[string]interface
		} else {
			log.Println("mapResp TYPE:", reflect.TypeOf(mapResp), "\n")
			log.Println(mapResp)
		}

		log.Println("end---")

		var esResp elasticResponce
		log.Println(">1")
		if err := json.NewDecoder(res.Body).Decode(&esResp); err != nil {
			log.Println("error parsing the response body")
			return fmt.Errorf("Error parsing the response body: %s", err)
		}
		if len(esResp.Hits.Hits) == 0 {
			log.Println("0 hits")
			break
		}
		log.Println(">2")

		for _, hit := range esResp.Hits.Hits {
			log.Println("marshalling")
			var esLog elasticsearchLog
			if err = json.Unmarshal(hit.Source, &esLog); err != nil {
				c.errChan <- err
				continue
			}
			log.Println(">marshal done")
			token, err := GetToken(esLog.Message)
			if err != nil {
				log.Println("match not found for:")
				log.Println(esLog.Message)
				c.errChan <- err
				continue
			}
			//parsedTime, err := time.Parse(time.RFC3339, esLog.Timestamp)
			//if err != nil {
			//	c.errChan <- err
			//	continue
			//}
			log.Println("found match using")
			log.Println(esLog.Message)
			timestamp := uint64(utime.ToMilliseconds(esLog.Time))
			c.setLastMessageTimestamp(timestamp)
			c.evChan <- &SessionErrorEvent{
				//SessionID: sessionID,
				Token: token,
				RawErrorEvent: &messages.RawErrorEvent{
					Source:    "elasticsearch",
					Timestamp: timestamp,
					Name:      hit.Id, // sure?
					Payload:   string(hit.Source),
				},
			}
		}
		log.Println(">scrolling")
		res, err = esC.Scroll(
			esC.Scroll.WithContext(context.Background()),
			esC.Scroll.WithScrollID(esResp.ScrollId),
			esC.Scroll.WithScroll(time.Minute*2),
		)
		if err != nil {
			log.Println("error scrolling")
			return fmt.Errorf("Error getting scroll response: %s", err)
		}
		defer res.Body.Close()
		if res.IsError() {
			log.Println("error map")
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
