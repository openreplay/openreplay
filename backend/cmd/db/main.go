package main

import (
	"encoding/json"
	"errors"
	"log"
	"openreplay/backend/pkg/queue/types"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/internal/db/datasaver"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/handlers"
	custom2 "openreplay/backend/pkg/handlers/custom"
	logger "openreplay/backend/pkg/log"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/sessions"
)

func main() {
	metrics := monitoring.New("db")

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := db.New()

	// Init database
	pg := cache.NewPGCache(postgres.NewConn(cfg.Postgres, cfg.BatchQueueLimit, cfg.BatchSizeLimit, metrics), cfg.ProjectExpirationTimeoutMs)
	defer pg.Close()

	// HandlersFabric returns the list of message handlers we want to be applied to each incoming message.
	handlersFabric := func() []handlers.MessageProcessor {
		return []handlers.MessageProcessor{
			&custom2.EventMapper{},
			custom2.NewInputEventBuilder(),
			custom2.NewPageEventBuilder(),
		}
	}

	// Create handler's aggregator
	builderMap := sessions.NewBuilderMap(handlersFabric)

	// Init modules
	saver := datasaver.New(pg)
	saver.InitStats()
	statsLogger := logger.NewQueueStats(cfg.LoggerTimeout)

	keepMessage := func(tp int) bool {
		return tp == messages.MsgMetadata || tp == messages.MsgIssueEvent || tp == messages.MsgSessionStart || tp == messages.MsgSessionEnd || tp == messages.MsgUserID || tp == messages.MsgUserAnonymousID || tp == messages.MsgCustomEvent || tp == messages.MsgClickEvent || tp == messages.MsgInputEvent || tp == messages.MsgPageEvent || tp == messages.MsgErrorEvent || tp == messages.MsgFetchEvent || tp == messages.MsgGraphQLEvent || tp == messages.MsgIntegrationEvent || tp == messages.MsgPerformanceTrackAggr || tp == messages.MsgResourceEvent || tp == messages.MsgLongTask || tp == messages.MsgJSException || tp == messages.MsgResourceTiming || tp == messages.MsgRawCustomEvent || tp == messages.MsgCustomIssue || tp == messages.MsgFetch || tp == messages.MsgGraphQL || tp == messages.MsgStateAction || tp == messages.MsgSetInputTarget || tp == messages.MsgSetInputValue || tp == messages.MsgCreateDocument || tp == messages.MsgMouseClick || tp == messages.MsgSetPageLocation || tp == messages.MsgPageLoadTiming || tp == messages.MsgPageRenderTiming
	}

	// Producer for quickwit topic
	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(15000)

	// FetchEvent for quickwit
	type FetchEvent struct {
		Method    string `json:"method"`
		URL       string `json:"url"`
		Request   string `json:"request"`
		Response  string `json:"response"`
		Status    uint64 `json:"status"`
		Timestamp uint64 `json:"timestamp"`
		Duration  uint64 `json:"duration"`
	}

	// PageEvent for quickwit
	type PageEvent struct {
		MessageID                  uint64 `json:"message_id"`
		Timestamp                  uint64 `json:"timestamp"`
		URL                        string `json:"url"`
		Referrer                   string `json:"referrer"`
		Loaded                     bool   `json:"loaded"`
		RequestStart               uint64 `json:"request_start"`
		ResponseStart              uint64 `json:"response_start"`
		ResponseEnd                uint64 `json:"response_end"`
		DomContentLoadedEventStart uint64 `json:"dom_content_loaded_event_start"`
		DomContentLoadedEventEnd   uint64 `json:"dom_content_loaded_event_end"`
		LoadEventStart             uint64 `json:"load_event_start"`
		LoadEventEnd               uint64 `json:"load_event_end"`
		FirstPaint                 uint64 `json:"first_paint"`
		FirstContentfulPaint       uint64 `json:"first_contentful_paint"`
		SpeedIndex                 uint64 `json:"speed_index"`
		VisuallyComplete           uint64 `json:"visually_complete"`
		TimeToInteractive          uint64 `json:"time_to_interactive"`
	}

	// GraphQLEvent for quickwit
	type GraphQLEvent struct {
		OperationKind string `json:"operation_kind"`
		OperationName string `json:"operation_name"`
		Variables     string `json:"variables"`
		Response      string `json:"response"`
	}

	// Handler logic
	handler := func(sessionID uint64, iter messages.Iterator, meta *types.Meta) {
		statsLogger.Collect(sessionID, meta)

		for iter.Next() {
			if !keepMessage(iter.Type()) {
				continue
			}
			msg := iter.Message().Decode()

			// Send data to quickwit topic
			var (
				event []byte
				err   error
			)
			switch m := msg.(type) {
			// Common
			case *messages.Fetch:
				event, err = json.Marshal(FetchEvent{
					Method:    m.Method,
					URL:       m.URL,
					Request:   m.Request,
					Response:  m.Response,
					Status:    m.Status,
					Timestamp: m.Timestamp,
					Duration:  m.Duration,
				})
			case *messages.FetchEvent:
				event, err = json.Marshal(FetchEvent{
					Method:    m.Method,
					URL:       m.URL,
					Request:   m.Request,
					Response:  m.Response,
					Status:    m.Status,
					Timestamp: m.Timestamp,
					Duration:  m.Duration,
				})
			case *messages.PageEvent:
				event, err = json.Marshal(PageEvent{
					MessageID:                  m.MessageID,
					Timestamp:                  m.Timestamp,
					URL:                        m.URL,
					Referrer:                   m.Referrer,
					Loaded:                     m.Loaded,
					RequestStart:               m.RequestStart,
					ResponseStart:              m.ResponseStart,
					ResponseEnd:                m.ResponseEnd,
					DomContentLoadedEventStart: m.DomContentLoadedEventStart,
					DomContentLoadedEventEnd:   m.DomContentLoadedEventEnd,
					LoadEventStart:             m.LoadEventStart,
					LoadEventEnd:               m.LoadEventEnd,
					FirstPaint:                 m.FirstPaint,
					FirstContentfulPaint:       m.FirstContentfulPaint,
					SpeedIndex:                 m.SpeedIndex,
					VisuallyComplete:           m.VisuallyComplete,
					TimeToInteractive:          m.TimeToInteractive,
				})
			case *messages.GraphQL:
				event, err = json.Marshal(GraphQLEvent{
					OperationKind: m.OperationKind,
					OperationName: m.OperationName,
					Variables:     m.Variables,
					Response:      m.Response,
				})
			case *messages.GraphQLEvent:
				event, err = json.Marshal(GraphQLEvent{
					OperationKind: m.OperationKind,
					OperationName: m.OperationName,
					Variables:     m.Variables,
					Response:      m.Response,
				})
			}
			if err != nil {
				log.Printf("can't marshal json for quickwit: %s", err)
			} else {
				if len(event) > 0 {
					if err := producer.Produce("quickwit", sessionID, event); err != nil {
						log.Printf("can't send event to quickwit: %s", err)
					}
				} else {
					log.Printf("event is empty")
				}

				// Just save session data into db without additional checks
				if err := saver.InsertMessage(sessionID, msg); err != nil {
					if !postgres.IsPkeyViolation(err) {
						log.Printf("Message Insertion Error %v, SessionID: %v, Message: %v", err, sessionID, msg)
					}
					return
				}

				session, err := pg.GetSession(sessionID)
				if session == nil {
					if err != nil && !errors.Is(err, cache.NilSessionInCacheError) {
						log.Printf("Error on session retrieving from cache: %v, SessionID: %v, Message: %v", err, sessionID, msg)
					}
					return
				}

				// Save statistics to db
				err = saver.InsertStats(session, msg)
				if err != nil {
					log.Printf("Stats Insertion Error %v; Session: %v, Message: %v", err, session, msg)
				}

				// Handle heuristics and save to temporary queue in memory
				builderMap.HandleMessage(sessionID, msg, msg.Meta().Index)

				// Process saved heuristics messages as usual messages above in the code
				builderMap.IterateSessionReadyMessages(sessionID, func(msg messages.Message) {
					if err := saver.InsertMessage(sessionID, msg); err != nil {
						if !postgres.IsPkeyViolation(err) {
							log.Printf("Message Insertion Error %v; Session: %v,  Message %v", err, session, msg)
						}
						return
					}

					if err := saver.InsertStats(session, msg); err != nil {
						log.Printf("Stats Insertion Error %v; Session: %v,  Message %v", err, session, msg)
					}
				})
			}
		}
	}

	// Init consumer
	consumer := queue.NewMessageConsumer(
		cfg.GroupDB,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicAnalytics,
		},
		handler,
		false,
		cfg.MessageSizeLimit,
	)

	log.Printf("Db service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	commitTick := time.Tick(cfg.CommitBatchTimeout)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			consumer.Close()
			os.Exit(0)
		case <-commitTick:
			// Send collected batches to db
			start := time.Now()
			pg.CommitBatches()
			pgDur := time.Now().Sub(start).Milliseconds()

			start = time.Now()
			if err := saver.CommitStats(); err != nil {
				log.Printf("Error on stats commit: %v", err)
			}
			chDur := time.Now().Sub(start).Milliseconds()
			log.Printf("commit duration(ms), pg: %d, ch: %d", pgDur, chDur)

			// TODO: use commit worker to save time each tick
			if err := consumer.Commit(); err != nil {
				log.Printf("Error on consumer commit: %v", err)
			}
		default:
			// Handle new message from queue
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}
