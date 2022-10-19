package failover

import (
	"fmt"
	"log"
	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
)

const numberOfPartitions = 16

type SessionFinder interface {
	Find(sessionID, timestamp uint64)
	Stop()
}

// Finder mock for not configurable builds
type sessionFinderMock struct{}

func (s *sessionFinderMock) Find(sessionID, timestamp uint64) {}
func (s *sessionFinderMock) Stop()                            {}

// Finder implementation
type sessionFinderImpl struct {
	topicName        string
	producerTimeout  int
	producer         types.Producer
	consumer         types.Consumer
	notFoundSessions map[uint64]struct{}
	storage          *storage.Storage
	done             chan struct{}
}

func NewSessionFinder(cfg *config.Config, stg *storage.Storage) (SessionFinder, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case stg == nil:
		return nil, fmt.Errorf("storage is empty")
	case cfg.UseFailover && cfg.TopicFailover == "":
		return nil, fmt.Errorf("failover topic is empty")
	case !cfg.UseFailover:
		return &sessionFinderMock{}, nil
	}

	finder := &sessionFinderImpl{
		topicName:        cfg.TopicFailover,
		producerTimeout:  cfg.ProducerCloseTimeout,
		notFoundSessions: make(map[uint64]struct{}),
		storage:          stg,
		done:             make(chan struct{}, 1),
	}
	finder.producer = queue.NewProducer(cfg.MessageSizeLimit, false)
	finder.consumer = queue.NewConsumer(
		cfg.GroupFailover,
		[]string{
			cfg.TopicFailover,
		},
		messages.NewMessageIterator(
			func(msg messages.Message) {
				m := msg.(*messages.SessionSearch)
				finder.findSession(m.SessionID(), m.Timestamp, m.Partition)
			}, []int{messages.MsgSessionSearch}, true),
		true,
		cfg.MessageSizeLimit,
	)
	go finder.worker()
	return finder, nil
}

// Read from queue and wait done signal
func (s *sessionFinderImpl) worker() {
	for {
		select {
		case <-s.done:
			s.producer.Close(s.producerTimeout)
			s.consumer.Close()
			return
		default:
			err := s.consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}

func (s *sessionFinderImpl) findSession(sessionID, timestamp, partition uint64) {
	sessEnd := &messages.SessionEnd{Timestamp: timestamp}
	sessEnd.SetSessionID(sessionID)
	err := s.storage.UploadSessionFiles(sessEnd)
	if err == nil {
		log.Printf("found session: %d in partition: %d, original: %d",
			sessionID, partition, sessionID%numberOfPartitions)
		if _, ok := s.notFoundSessions[sessionID]; ok {
			delete(s.notFoundSessions, sessionID)
		}
		return
	}
	if _, ok := s.notFoundSessions[sessionID]; ok {
		log.Printf("skip previously not found session: %d", sessionID)
		return
	}

	// Stop session search process if next partition is the same as original one
	nextPartition := s.nextPartition(partition)
	if nextPartition == sessionID%numberOfPartitions {
		log.Printf("failover mechanism didn't help; sessID: %d", sessionID)
		s.notFoundSessions[sessionID] = struct{}{}
		return
	}
	s.sendSearchMessage(sessionID, timestamp, nextPartition)
}

func (s *sessionFinderImpl) nextPartition(partition uint64) uint64 {
	partition++
	if partition > numberOfPartitions-1 {
		partition = 0
	}
	return partition
}

// Create sessionSearch message and send it to queue
func (s *sessionFinderImpl) sendSearchMessage(sessionID, timestamp, partition uint64) {
	msg := &messages.SessionSearch{Timestamp: timestamp, Partition: partition}
	if err := s.producer.ProduceToPartition(s.topicName, partition, sessionID, msg.Encode()); err != nil {
		log.Printf("can't send SessionSearch to failover topic: %s; sessID: %d", err, sessionID)
	}
}

func (s *sessionFinderImpl) Find(sessionID, timestamp uint64) {
	s.sendSearchMessage(sessionID, timestamp, s.nextPartition(sessionID%numberOfPartitions))
}

// Stop sends done signal to internal worker to close producer and consumer and exit from worker goroutine
func (s *sessionFinderImpl) Stop() {
	s.done <- struct{}{}
}
