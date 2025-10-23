package kafka

import (
	"log"
	"os"
	"strings"
	"time"

	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/pkg/errors"
)

type Message = kafka.Message

type consumerImpl struct {
	c                 *kafka.Consumer
	messageIterator   messages.MessageIterator
	commitTicker      *time.Ticker
	pollTimeout       uint
	lastReceivedPrtTs map[int32]int64
	rebalanceHandler  types.RebalanceHandler
}

func NewConsumer(
	group string,
	topics []string,
	messageIterator messages.MessageIterator,
	autoCommit bool,
	messageSizeLimit int,
	rebalanceHandler types.RebalanceHandler,
) types.Consumer {
	kafkaConfig := &kafka.ConfigMap{
		"bootstrap.servers":               env.String("KAFKA_SERVERS"),
		"group.id":                        group,
		"auto.offset.reset":               "earliest",
		"enable.auto.commit":              "false",
		"security.protocol":               "plaintext",
		"go.application.rebalance.enable": true,
		"max.poll.interval.ms":            env.Int("KAFKA_MAX_POLL_INTERVAL_MS"),
		"max.partition.fetch.bytes":       messageSizeLimit,
		"go.logs.channel.enable":          true,
	}
	// Apply ssl configuration
	if env.Bool("KAFKA_USE_SSL") {
		kafkaConfig.SetKey("security.protocol", "ssl")
		kafkaConfig.SetKey("ssl.ca.location", os.Getenv("KAFKA_SSL_CA"))
		kafkaConfig.SetKey("ssl.key.location", os.Getenv("KAFKA_SSL_KEY"))
		kafkaConfig.SetKey("ssl.certificate.location", os.Getenv("KAFKA_SSL_CERT"))
	}

	// Apply Kerberos configuration
	if env.Bool("KAFKA_USE_KERBEROS") {
		kafkaConfig.SetKey("security.protocol", "sasl_plaintext")
		kafkaConfig.SetKey("sasl.mechanisms", "GSSAPI")
		kafkaConfig.SetKey("sasl.kerberos.service.name", os.Getenv("KERBEROS_SERVICE_NAME"))
		kafkaConfig.SetKey("sasl.kerberos.principal", os.Getenv("KERBEROS_PRINCIPAL"))
		kafkaConfig.SetKey("sasl.kerberos.keytab", os.Getenv("KERBEROS_KEYTAB_LOCATION"))
	}

	c, err := kafka.NewConsumer(kafkaConfig)
	if err != nil {
		log.Fatalln(err)
	}

	var commitTicker *time.Ticker
	if autoCommit {
		commitTicker = time.NewTicker(2 * time.Minute)
	}

	consumer := &consumerImpl{
		c:                 c,
		messageIterator:   messageIterator,
		commitTicker:      commitTicker,
		pollTimeout:       200,
		lastReceivedPrtTs: make(map[int32]int64, 16),
		rebalanceHandler:  rebalanceHandler,
	}

	if err := c.SubscribeTopics(topics, consumer.reBalanceCallback); err != nil {
		log.Fatalln(err)
	}
	go func() {
		for {
			logMsg := <-consumer.c.Logs()
			if logMsg.Tag == "MAXPOLL" && strings.Contains(logMsg.Message, "leaving group") {
				// By some reason service logic took too much time and was kicked out from the group
				log.Printf("Kafka consumer left the group, exiting...")
				os.Exit(1)
			}
			if logMsg != (kafka.LogEvent{}) {
				log.Printf("Kafka consumer log: %s", logMsg.String())
			}
		}
	}()
	return consumer
}

func (consumer *consumerImpl) reBalanceCallback(c *kafka.Consumer, e kafka.Event) error {
	if consumer.rebalanceHandler == nil {
		return nil
	}
	getPartitionsNumbers := func(partitions []kafka.TopicPartition) []uint64 {
		parts := make([]uint64, len(partitions))
		for i, p := range partitions {
			parts[i] = uint64(p.Partition)
		}
		return parts
	}
	getTopicName := func(partitions []kafka.TopicPartition) string {
		topic := "no-info"
		if len(partitions) > 0 && partitions[0].Topic != nil {
			topic = *partitions[0].Topic
		}
		return topic
	}
	switch evt := e.(type) {
	case kafka.RevokedPartitions:
		partitions := getPartitionsNumbers(evt.Partitions)
		log.Printf("RebalanceTypeRevoke, topic: %s, partitions: %v", getTopicName(evt.Partitions), partitions)
		consumer.rebalanceHandler(types.RebalanceTypeRevoke, partitions)
	case kafka.AssignedPartitions:
		partitions := getPartitionsNumbers(evt.Partitions)
		log.Printf("RebalanceTypeAssign, topic: %s, partitions: %v", getTopicName(evt.Partitions), partitions)
		consumer.rebalanceHandler(types.RebalanceTypeAssign, partitions)
	}
	if _, err := c.Commit(); err != nil {
		log.Println("reBalanceCallback error: can't commit the current state, ", err)
	}
	return nil
}

func (consumer *consumerImpl) Commit() error {
	consumer.c.Commit() // TODO: return error if it is not "No offset stored"
	return nil
}

func (consumer *consumerImpl) commitAtTimestamps(
	getPartitionTime func(kafka.TopicPartition) (bool, int64),
	limitToCommitted bool,
) error {
	assigned, err := consumer.c.Assignment()
	if err != nil {
		return err
	}

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

func (consumer *consumerImpl) CommitBack(gap int64) error {
	return consumer.commitAtTimestamps(func(p kafka.TopicPartition) (bool, int64) {
		lastTs, ok := consumer.lastReceivedPrtTs[p.Partition]
		if !ok {
			return false, 0
		}
		return true, lastTs - gap
	}, true)
}

func (consumer *consumerImpl) CommitAtTimestamp(commitTs int64) error {
	return consumer.commitAtTimestamps(func(p kafka.TopicPartition) (bool, int64) {
		return true, commitTs
	}, false)
}

func (consumer *consumerImpl) ConsumeNext() error {
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
		consumer.messageIterator.Iterate(
			e.Value,
			messages.NewBatchInfo(
				decodeKey(e.Key),
				*(e.TopicPartition.Topic),
				uint64(e.TopicPartition.Offset),
				uint64(e.TopicPartition.Partition),
				ts))
		consumer.lastReceivedPrtTs[e.TopicPartition.Partition] = ts
	case kafka.Error:
		if e.Code() == kafka.ErrAllBrokersDown || e.Code() == kafka.ErrMaxPollExceeded {
			os.Exit(1)
		}
		log.Printf("Consumer error: %v\n", e)
	}
	return nil
}

func (consumer *consumerImpl) Close() {
	if consumer.commitTicker != nil {
		consumer.Commit()
	}
	if err := consumer.c.Close(); err != nil {
		log.Printf("Kafka consumer close error: %v", err)
	}
}
