package kafka

import (
	"log"
	"os"
	"time"

	"github.com/pkg/errors"

	"gopkg.in/confluentinc/confluent-kafka-go.v1/kafka"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/queue/types"
)

type Message = kafka.Message

type Consumer struct {
	c              *kafka.Consumer
	messageHandler types.MessageHandler
	commitTicker   *time.Ticker
	pollTimeout    uint

	lastReceivedPrtTs map[int32]int64
}

func NewConsumer(
	group string,
	topics []string,
	messageHandler types.MessageHandler,
	autoCommit bool,
	messageSizeLimit int,
) *Consumer {
	kafkaConfig := &kafka.ConfigMap{
		"bootstrap.servers":               env.String("KAFKA_SERVERS"),
		"group.id":                        group,
		"auto.offset.reset":               "earliest",
		"enable.auto.commit":              "false",
		"security.protocol":               "plaintext",
		"go.application.rebalance.enable": true,
		"max.poll.interval.ms":            env.Int("KAFKA_MAX_POLL_INTERVAL_MS"),
		"max.partition.fetch.bytes":       messageSizeLimit,
	}
	// Apply ssl configuration
	if env.Bool("KAFKA_USE_SSL") {
		kafkaConfig.SetKey("security.protocol", "ssl")
		kafkaConfig.SetKey("ssl.ca.location", os.Getenv("KAFKA_SSL_CA"))
		kafkaConfig.SetKey("ssl.key.location", os.Getenv("KAFKA_SSL_KEY"))
		kafkaConfig.SetKey("ssl.certificate.location", os.Getenv("KAFKA_SSL_CERT"))
	}
	c, err := kafka.NewConsumer(kafkaConfig)
	if err != nil {
		log.Fatalln(err)
	}
	subREx := "^("
	for i, t := range topics {
		if i != 0 {
			subREx += "|"
		}
		subREx += t
	}
	subREx += ")$"
	if err := c.Subscribe(subREx, nil); err != nil {
		log.Fatalln(err)
	}

	var commitTicker *time.Ticker
	if autoCommit {
		commitTicker = time.NewTicker(2 * time.Minute)
	}

	return &Consumer{
		c:                 c,
		messageHandler:    messageHandler,
		commitTicker:      commitTicker,
		pollTimeout:       200,
		lastReceivedPrtTs: make(map[int32]int64),
	}
}

func (consumer *Consumer) Commit() error {
	consumer.c.Commit() // TODO: return error if it is not "No offset stored"
	return nil
}

func (consumer *Consumer) commitAtTimestamps(
	getPartitionTime func(kafka.TopicPartition) (bool, int64),
	limitToCommitted bool,
) error {
	assigned, err := consumer.c.Assignment()
	if err != nil {
		return err
	}
	logPartitions("Actually assigned:", assigned)

	var timestamps []kafka.TopicPartition
	for _, p := range assigned { // p is a copy here since it is not a pointer
		shouldCommit, commitTs := getPartitionTime(p)
		if !shouldCommit {
			continue
		} // didn't receive anything yet
		p.Offset = kafka.Offset(commitTs)
		timestamps = append(timestamps, p)
	}
	offsets, err := consumer.c.OffsetsForTimes(timestamps, 2000)
	if err != nil {
		return errors.Wrap(err, "Kafka Consumer back commit error")
	}

	if limitToCommitted {
		// Limiting to already committed
		committed, err := consumer.c.Committed(assigned, 2000) // memorise?
		if err != nil {
			return errors.Wrap(err, "Kafka Consumer retrieving committed error")
		}
		logPartitions("Actually committed:", committed)
		for _, comm := range committed {
			if comm.Offset == kafka.OffsetStored ||
				comm.Offset == kafka.OffsetInvalid ||
				comm.Offset == kafka.OffsetBeginning ||
				comm.Offset == kafka.OffsetEnd {
				continue
			}
			for _, offs := range offsets {
				if offs.Partition == comm.Partition &&
					(comm.Topic != nil && offs.Topic != nil && *comm.Topic == *offs.Topic) &&
					comm.Offset > offs.Offset {
					offs.Offset = comm.Offset
				}
			}
		}
	}

	// TODO: check per-partition errors: offsets[i].Error
	_, err = consumer.c.CommitOffsets(offsets)
	return errors.Wrap(err, "Kafka Consumer back commit error")
}

func (consumer *Consumer) CommitBack(gap int64) error {
	return consumer.commitAtTimestamps(func(p kafka.TopicPartition) (bool, int64) {
		lastTs, ok := consumer.lastReceivedPrtTs[p.Partition]
		if !ok {
			return false, 0
		}
		return true, lastTs - gap
	}, true)
}

func (consumer *Consumer) CommitAtTimestamp(commitTs int64) error {
	return consumer.commitAtTimestamps(func(p kafka.TopicPartition) (bool, int64) {
		return true, commitTs
	}, false)
}

func (consumer *Consumer) ConsumeNext() error {
	ev := consumer.c.Poll(int(consumer.pollTimeout))
	if ev == nil {
		return nil
	}

	if consumer.commitTicker != nil {
		select {
		case <-consumer.commitTicker.C:
			consumer.Commit()
		default:
		}
	}

	switch e := ev.(type) {
	case *kafka.Message:
		if e.TopicPartition.Error != nil {
			return errors.Wrap(e.TopicPartition.Error, "Consumer Partition Error")
		}
		ts := e.Timestamp.UnixMilli()
		consumer.messageHandler(decodeKey(e.Key), e.Value, &types.Meta{
			Topic:     *(e.TopicPartition.Topic),
			ID:        uint64(e.TopicPartition.Offset),
			Timestamp: ts,
		})
		consumer.lastReceivedPrtTs[e.TopicPartition.Partition] = ts
	case kafka.Error:
		if e.Code() == kafka.ErrAllBrokersDown || e.Code() == kafka.ErrMaxPollExceeded {
			os.Exit(1)
		}
		log.Printf("Consumer error: %v\n", e)
	}
	return nil
}

func (consumer *Consumer) Close() {
	if consumer.commitTicker != nil {
		consumer.Commit()
	}
	if err := consumer.c.Close(); err != nil {
		log.Printf("Kafka consumer close error: %v", err)
	}
}

func (consumer *Consumer) HasFirstPartition() bool {
	assigned, err := consumer.c.Assignment()
	if err != nil {
		return false
	}
	for _, p := range assigned {
		if p.Partition == 1 {
			return true
		}
	}
	return false
}
