package connector

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	v4 "github.com/aws/aws-sdk-go/aws/signer/v4"
	"github.com/elastic/go-elasticsearch/v7"
	"github.com/elastic/go-elasticsearch/v8/esapi"

	"openreplay/backend/internal/config/connector"
	"openreplay/backend/pkg/logger"
)

const (
	sessionsIndex = "sessions"
	eventsIndex   = "events"
)

type awsSignerTransport struct {
	HTTPClient  *http.Client
	AWSSession  *session.Session
	AWSService  string
	AWSRegion   string
	Credentials *credentials.Credentials
	signer      *v4.Signer
}

func (a *awsSignerTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	var (
		err  error
		body io.ReadSeeker = nil
	)

	if req.Body != nil {
		bodyBytes, err := io.ReadAll(req.Body)
		if err != nil {
			log.Println("Error reading request body: ", err)
			return nil, err
		}
		req.Body.Close()
		body = bytes.NewReader(bodyBytes)
	}

	_, err = a.signer.Sign(req, body, a.AWSService, a.AWSRegion, time.Now())
	if err != nil {
		return nil, err
	}
	return a.HTTPClient.Do(req)
}

type ElasticSearch struct {
	log  logger.Logger
	cfg  *connector.Config
	conn *elasticsearch.Client
}

func NewElasticSearch(log logger.Logger, cfg *connector.Config) (*ElasticSearch, error) {
	esConf := elasticsearch.Config{
		Addresses: cfg.GetURLs(),
	}
	if cfg.UseAWS {
		sess, err := session.NewSession()
		if err != nil {
			return nil, err
		}
		esConf.Transport = &awsSignerTransport{
			HTTPClient:  &http.Client{},
			AWSSession:  sess,
			AWSService:  "es",
			AWSRegion:   cfg.AWSRegion,
			Credentials: sess.Config.Credentials,
			signer:      v4.NewSigner(sess.Config.Credentials),
		}
	}
	es, err := elasticsearch.NewClient(esConf)
	if err != nil {
		return nil, err
	}

	// Test the connection to the Elasticsearch server with the Info() API
	res, err := es.Info()
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	return &ElasticSearch{
		log:  log,
		cfg:  cfg,
		conn: es,
	}, nil
}

func (e *ElasticSearch) InsertEvents(batch []map[string]string) error {
	e.log.Info(context.Background(), "Inserting events into ElasticSearch, events: %d", len(batch))
	var buf bytes.Buffer
	noIndexStr := `{"index":{}}\n`

	for _, doc := range batch {
		data, _ := json.Marshal(doc)
		buf.Grow(len(noIndexStr) + len(data) + 1)
		buf.WriteString(noIndexStr)
		buf.Write(data)
		buf.WriteByte('\n')
	}
	return e.doRequest(eventsIndex, buf)
}

func (e *ElasticSearch) InsertSessions(batch []map[string]string) error {
	e.log.Info(context.Background(), "Inserting sessions into ElasticSearch, sessions: %d", len(batch))
	var buf bytes.Buffer

	for _, doc := range batch {
		meta := map[string]interface{}{
			"index": map[string]interface{}{
				"_index": sessionsIndex,
				"_id":    doc["sessionid"],
			},
		}

		metadata, _ := json.Marshal(meta)
		data, _ := json.Marshal(doc)
		buf.Grow(len(metadata) + len(data) + 2)
		buf.Write(metadata)
		buf.WriteByte('\n')
		buf.Write(data)
		buf.WriteByte('\n')
	}
	return e.doRequest(sessionsIndex, buf)
}

func (e *ElasticSearch) doRequest(index string, data bytes.Buffer) error {
	req := esapi.BulkRequest{
		Index:   index,
		Body:    &data,
		Refresh: "false",
	}
	res, err := req.Do(context.Background(), e.conn)
	if err != nil || res.IsError() {
		if err != nil {
			e.log.Fatal(context.Background(), "Error getting response: %s", err)
		} else {
			e.log.Fatal(context.Background(), "Error indexing batch: %s", res.String())
		}
	}
	res.Body.Close()
	return nil
}

func (e *ElasticSearch) Close() error {
	return nil
}
