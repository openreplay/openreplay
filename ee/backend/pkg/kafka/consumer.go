package kafka

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/pkg/errors"

	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
)

type Message = kafka.Message

type consumerImpl struct {
	log               logger.Logger
	consumer          *kafka.Consumer
	messageIterator   messages.MessageIterator
	commitTicker      *time.Ticker
	pollTimeout       int
	lastReceivedPrtTs map[string]map[int32]int64
	rebalanceHandler  types.RebalanceHandler
	stopChan          chan struct{}
}

func NewConsumer(
	log logger.Logger,
	group string,
	topics []string,
	messageIterator messages.MessageIterator,
	autoCommit bool,
	messageSizeLimit int,
	rebalanceHandler types.RebalanceHandler,
) (types.Consumer, error) {
	kafkaConfig := &kafka.ConfigMap{
		"bootstrap.servers":               env.String("KAFKA_SERVERS"),
		"group.id":                        group,
		"auto.offset.reset":               "earliest",
		"enable.auto.commit":              "false",
		"go.application.rebalance.enable": true,
		"max.poll.interval.ms":            env.Int("KAFKA_MAX_POLL_INTERVAL_MS"),
		"max.partition.fetch.bytes":       messageSizeLimit,
		"go.logs.channel.enable":          true,
	}

	useSSL := env.Bool("KAFKA_USE_SSL")
	useKerberos := env.Bool("KAFKA_USE_KERBEROS")

	switch {
	case useKerberos && useSSL:
		kafkaConfig.SetKey("security.protocol", "sasl_ssl")
	case useKerberos:
		kafkaConfig.SetKey("security.protocol", "sasl_plaintext")
	case useSSL:
		kafkaConfig.SetKey("security.protocol", "ssl")
	default:
		kafkaConfig.SetKey("security.protocol", "plaintext")
	}

	if useSSL {
		kafkaConfig.SetKey("ssl.ca.location", os.Getenv("KAFKA_SSL_CA"))
		kafkaConfig.SetKey("ssl.key.location", os.Getenv("KAFKA_SSL_KEY"))
		kafkaConfig.SetKey("ssl.certificate.location", os.Getenv("KAFKA_SSL_CERT"))
	}
	if useKerberos {
		kafkaConfig.SetKey("sasl.mechanisms", "GSSAPI")
		kafkaConfig.SetKey("sasl.kerberos.service.name", os.Getenv("KERBEROS_SERVICE_NAME"))
		kafkaConfig.SetKey("sasl.kerberos.principal", os.Getenv("KERBEROS_PRINCIPAL"))
		kafkaConfig.SetKey("sasl.kerberos.keytab", os.Getenv("KERBEROS_KEYTAB_LOCATION"))
	}

	c, err := kafka.NewConsumer(kafkaConfig)
	if err != nil {
		return nil, err
	}

	consumer := &consumerImpl{
		log:               log,
		consumer:          c,
		messageIterator:   messageIterator,
		pollTimeout:       200,
		lastReceivedPrtTs: make(map[string]map[int32]int64, 4),
		rebalanceHandler:  rebalanceHandler,
		stopChan:          make(chan struct{}),
	}
	if autoCommit {
		consumer.commitTicker = time.NewTicker(2 * time.Minute)
	}
	if err = c.SubscribeTopics(topics, consumer.reBalanceCallback); err != nil {
		return nil, err
	}
	for _, topic := range topics {
		consumer.lastReceivedPrtTs[topic] = make(map[int32]int64, 16)
	}
	go consumer.kafkaLogger()
	return consumer, nil
}

func (c *consumerImpl) kafkaLogger() {
	for {
		select {
		case <-c.stopChan:
			return
		case logMsg, ok := <-c.consumer.Logs():
			if !ok {
				return
			}
			if logMsg.Tag == "MAXPOLL" && strings.Contains(logMsg.Message, "leaving group") {
				c.log.Warn(context.Background(), "kafka consumer left the group, exiting...")
				os.Exit(1) // TODO: inform the main logic
			}
			c.log.Info(context.Background(), "kafka consumer log: %s", logMsg.String())
		}
	}
}

func (c *consumerImpl) reBalanceCallback(_ *kafka.Consumer, e kafka.Event) error {
	if c.rebalanceHandler == nil {
		return nil
	}
	getPartitionsNumbers := func(partitions []kafka.TopicPartition) []uint64 {
		parts := make([]uint64, len(partitions))
		for i, p := range partitions {
			parts[i] = uint64(p.Partition)
		}
		return parts
	}
	c.log.Info(context.Background(), e.String())
	switch evt := e.(type) {
	case kafka.RevokedPartitions:
		c.rebalanceHandler(types.RebalanceTypeRevoke, getPartitionsNumbers(evt.Partitions))
		if err := c.Commit(); err != nil {
			c.log.Info(context.Background(), "reBalanceCallback error: can't commit the current state, %s", err)
		}
	case kafka.AssignedPartitions:
		c.rebalanceHandler(types.RebalanceTypeAssign, getPartitionsNumbers(evt.Partitions))
	}
	return nil
}

func (c *consumerImpl) getPartitionTime(p kafka.TopicPartition, gap int64) (int64, bool) {
	if p.Topic == nil {
		return 0, false
	}
	if lastTs, ok := c.lastReceivedPrtTs[*p.Topic][p.Partition]; ok {
		res := lastTs - gap
		if res < 0 {
			res = 0
		}
		return res, true
	}
	return 0, false
}

func (c *consumerImpl) setPartitionTime(p kafka.TopicPartition, value int64) {
	if p.Topic != nil {
		c.lastReceivedPrtTs[*p.Topic][p.Partition] = value
	}
}

func (c *consumerImpl) CommitBack(gap int64) error {
	assigned, err := c.consumer.Assignment()
	if err != nil {
		return err
	}

	var timestamps []kafka.TopicPartition
	for _, p := range assigned {
		if commitTs, shouldCommit := c.getPartitionTime(p, gap); shouldCommit {
			p.Offset = kafka.Offset(commitTs)
			timestamps = append(timestamps, p)
		}
	}
	if len(timestamps) == 0 {
		return nil
	}

	offsets, err := c.consumer.OffsetsForTimes(timestamps, 2000)
	if err != nil {
		return fmt.Errorf("kafka consumer back commit error: %v", err)
	}

	committed, err := c.consumer.Committed(assigned, 2000)
	if err != nil {
		return fmt.Errorf("kafka consumer retrieving committed error: %v", err)
	}
	for _, comm := range committed {
		if comm.Offset == kafka.OffsetStored || comm.Offset == kafka.OffsetInvalid ||
			comm.Offset == kafka.OffsetBeginning || comm.Offset == kafka.OffsetEnd {
			continue
		}
		for i, offs := range offsets {
			if offs.Partition == comm.Partition &&
				comm.Topic != nil && offs.Topic != nil &&
				*comm.Topic == *offs.Topic &&
				comm.Offset > offs.Offset {
				offsets[i].Offset = comm.Offset
			}
		}
	}

	if _, err := c.consumer.CommitOffsets(offsets); err != nil {
		return fmt.Errorf("kafka consumer back commit error: %v", err)
	}
	return nil
}

func (c *consumerImpl) Commit() error {
	if _, err := c.consumer.Commit(); err != nil {
		var ke kafka.Error
		if errors.As(err, &ke) && ke.Code() != kafka.ErrNoOffset {
			return err
		}
	}
	return nil
}

func (c *consumerImpl) ConsumeNext() error {
	if c.commitTicker != nil {
		select {
		case <-c.commitTicker.C:
			if err := c.Commit(); err != nil {
				c.log.Error(context.Background(), "kafka consumer commit error: %s", err)
			}
		default:
		}
	}

	ev := c.consumer.Poll(c.pollTimeout)
	if ev == nil {
		return nil
	}

	switch e := ev.(type) {
	case *kafka.Message:
		if e.TopicPartition.Error != nil {
			return fmt.Errorf("consumer partition error: %v", e.TopicPartition.Error)
		}
		ts := e.Timestamp.UnixMilli()
		c.messageIterator.Iterate(
			e.Value,
			messages.NewBatchInfo(
				decodeKey(e.Key),
				*(e.TopicPartition.Topic),
				uint64(e.TopicPartition.Offset),
				uint64(e.TopicPartition.Partition),
				ts))
		c.setPartitionTime(e.TopicPartition, ts)
	case kafka.Error:
		if e.Code() == kafka.ErrAllBrokersDown || e.Code() == kafka.ErrMaxPollExceeded {
			return fmt.Errorf("kafka consumer error: %s", e)
		}
		c.log.Info(context.Background(), "consumer error: %s", e)
	}
	return nil
}

func (c *consumerImpl) Close() {
	if c.commitTicker != nil {
		c.commitTicker.Stop()
		if err := c.Commit(); err != nil {
			c.log.Info(context.Background(), "kafka consumer commit error: %s", err)
		}
	}
	if c.stopChan != nil {
		close(c.stopChan)
		c.stopChan = nil
	}
	if err := c.consumer.Close(); err != nil {
		c.log.Info(context.Background(), "kafka consumer close error: %s", err)
	}
}
