package kafka

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/pkg/errors"

	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
)

const (
	ActionTimeoutMs = 2000
	TickerTimeout   = time.Minute * 2
)

type consumerImpl struct {
	log               logger.Logger
	consumer          *kafka.Consumer
	messageIterator   messages.MessageIterator
	rebalanceHandler  types.RebalanceHandler
	pollTimeout       int
	readBackGapMs     int64
	commitBackGapMS   int64
	commitTicker      *time.Ticker
	gateTicker        *time.Ticker
	lastReceivedPrtTs map[string]map[int32]int64
	stopAt            map[string]map[int32]kafka.Offset
	lastOffset        map[string]map[int32]kafka.Offset
	stopChan          chan struct{}
	mutex             sync.RWMutex
}

func NewConsumer(
	log logger.Logger,
	group string,
	topics []string,
	messageIterator messages.MessageIterator,
	periodicCommit bool,
	messageSizeLimit int,
	rebalanceHandler types.RebalanceHandler,
	readGap time.Duration,
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
		rebalanceHandler:  rebalanceHandler,
		lastReceivedPrtTs: make(map[string]map[int32]int64, 4),
		stopAt:            make(map[string]map[int32]kafka.Offset, 4),
		lastOffset:        make(map[string]map[int32]kafka.Offset, 4),
		stopChan:          make(chan struct{}),
	}
	if readGap > 0 {
		consumer.readBackGapMs = readGap.Milliseconds()
		consumer.gateTicker = time.NewTicker(TickerTimeout)
	} else if readGap < 0 {
		log.Info(context.Background(), "will use commitBack() for reBalance callback")
		consumer.commitBackGapMS = (-readGap).Milliseconds()
	}
	if periodicCommit {
		consumer.commitTicker = time.NewTicker(TickerTimeout)
	}
	if err = c.SubscribeTopics(topics, consumer.reBalanceCallback); err != nil {
		return nil, err
	}
	for _, topic := range topics {
		consumer.lastReceivedPrtTs[topic] = make(map[int32]int64, 16)
		consumer.stopAt[topic] = make(map[int32]kafka.Offset, 16)
		consumer.lastOffset[topic] = make(map[int32]kafka.Offset, 16)
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

func getPartitionsNumbers(partitions []kafka.TopicPartition) []uint64 {
	parts := make([]uint64, len(partitions))
	for i, p := range partitions {
		parts[i] = uint64(p.Partition)
	}
	return parts // wrong result for several topics, but it doesn't affect the current logic
}

func (c *consumerImpl) reBalanceCallback(_ *kafka.Consumer, e kafka.Event) error {
	c.log.Info(context.Background(), e.String())
	switch evt := e.(type) {
	case kafka.RevokedPartitions:
		if c.rebalanceHandler != nil {
			c.rebalanceHandler(types.RebalanceTypeRevoke, getPartitionsNumbers(evt.Partitions))
		}
		if c.commitBackGapMS > 0 {
			if err := c.CommitBack(c.commitBackGapMS); err != nil {
				c.log.Error(context.Background(), "reBalanceCallback commitBack error, %v", err)
			}
		} else {
			if err := c.Commit(); err != nil {
				c.log.Error(context.Background(), "reBalanceCallback commit error, %v", err)
			}
		}
	case kafka.AssignedPartitions:
		if c.rebalanceHandler != nil {
			c.rebalanceHandler(types.RebalanceTypeAssign, getPartitionsNumbers(evt.Partitions))
		}
		if err := c.computeStopAt(evt.Partitions); err != nil {
			c.log.Error(context.Background(), "reBalanceCallback computeStopAt error: %v", err)
		}
	}
	return nil
}

func getInfo(tp kafka.TopicPartition) (string, int32, error) {
	if tp.Topic == nil {
		return "", 0, errors.New("topic is nil")
	}
	return *tp.Topic, tp.Partition, nil
}

func (c *consumerImpl) getPartitionTime(p kafka.TopicPartition, gap int64) (int64, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	topic, part, err := getInfo(p)
	if err != nil {
		return 0, false
	}
	if lastTs, ok := c.lastReceivedPrtTs[topic][part]; ok {
		res := lastTs - gap
		if res < 0 {
			res = 0
		}
		return res, true
	}
	return 0, false
}

func (c *consumerImpl) setPartitionTime(p kafka.TopicPartition, value int64) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	topic, part, err := getInfo(p)
	if err == nil {
		c.lastReceivedPrtTs[topic][part] = value
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

	offsets, err := c.consumer.OffsetsForTimes(timestamps, ActionTimeoutMs)
	if err != nil {
		return fmt.Errorf("consumer.CommitBack() getting offsets error: %v", err)
	}

	committed, err := c.consumer.Committed(assigned, ActionTimeoutMs)
	if err != nil {
		return fmt.Errorf("consumer.CommitBack() retrieving committed error: %v", err)
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
		return fmt.Errorf("consumer.CommitBack() committing offsets error: %v", err)
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

func (c *consumerImpl) shouldCommit() {
	if c.commitTicker != nil {
		select {
		case <-c.commitTicker.C:
			if err := c.Commit(); err != nil {
				c.log.Error(context.Background(), "consumer.shouldCommit() commit error: %s", err)
			}
		default:
		}
	}
}

func (c *consumerImpl) ConsumeNext() error {
	c.shouldCommit()
	c.shouldResume()

	ev := c.consumer.Poll(c.pollTimeout)
	if ev == nil {
		return nil
	}

	switch e := ev.(type) {
	case *kafka.Message:
		if e.TopicPartition.Error != nil {
			return fmt.Errorf("consumer.ConsumeNext() partition error: %v", e.TopicPartition.Error)
		}
		c.setPartitionTime(e.TopicPartition, e.Timestamp.UnixMilli())
		c.messageIterator.Iterate(
			e.Value,
			messages.NewBatchInfo(
				decodeKey(e.Key),
				*e.TopicPartition.Topic,
				uint64(e.TopicPartition.Offset),
				uint64(e.TopicPartition.Partition),
				e.Timestamp.UnixMilli(),
			),
		)
		c.shouldPause(e.TopicPartition)
	case kafka.Error:
		if e.Code() == kafka.ErrAllBrokersDown || e.Code() == kafka.ErrMaxPollExceeded {
			return fmt.Errorf("consumer.ConsumeNext() error: %s", e)
		}
		c.log.Warn(context.Background(), "consumer.ConsumeNext() warn: %s", e)
	}
	return nil
}

func (c *consumerImpl) computeStopAt(partitions []kafka.TopicPartition) error {
	if c.readBackGapMs <= 0 || len(partitions) == 0 {
		return nil
	}
	threshold := time.Now().UnixMilli() - c.readBackGapMs
	if threshold < 0 {
		threshold = 0
	}
	for i := 0; i < len(partitions); i++ {
		partitions[i].Offset = kafka.Offset(threshold)
	}
	res, err := c.consumer.OffsetsForTimes(partitions, ActionTimeoutMs)
	if err != nil {
		return fmt.Errorf("consumer.computeStopAt OffsetsForTimes: %s", err)
	}

	c.mutex.Lock()
	defer c.mutex.Unlock()

	for _, r := range res {
		topic, part, err := getInfo(r)
		if err != nil {
			continue
		}

		if r.Offset < 0 {
			high, _, err := c.consumer.QueryWatermarkOffsets(topic, part, ActionTimeoutMs)
			if err != nil {
				c.log.Warn(context.Background(), "consumer.computeStopAt watermark error: %s", err)
				c.stopAt[topic][part] = kafka.OffsetEnd
			} else {
				c.stopAt[topic][part] = kafka.Offset(high)
			}
		} else {
			c.stopAt[topic][part] = r.Offset
		}
	}
	return nil
}

func (c *consumerImpl) shouldPause(p kafka.TopicPartition) {
	if c.readBackGapMs <= 0 {
		return
	}
	topic, part, err := getInfo(p)
	if err != nil {
		return
	}
	c.mutex.Lock()
	c.lastOffset[topic][part] = p.Offset
	stop, ok := c.stopAt[topic][part]
	c.mutex.Unlock()
	if !ok {
		return
	}

	cur := p.Offset
	if cur >= stop {
		if err := c.Commit(); err != nil { // TODO: commit on the specific partition
			c.log.Info(context.Background(), "consumer.shouldPause() commit error: %v", err)
		}
		if err := c.consumer.Pause([]kafka.TopicPartition{p}); err != nil {
			c.log.Info(context.Background(), "consumer.shouldPause() pause error: %v", err)
		} else {
			c.log.Info(context.Background(), "consumer.shouldPause() paused %s[%d] at offset %d (stopAt %d)",
				topic, part, cur, stop)
		}
	}
}

func (c *consumerImpl) shouldResume() {
	if c.gateTicker == nil || c.readBackGapMs <= 0 {
		return
	}
	select {
	case <-c.gateTicker.C:
		assigned, err := c.consumer.Assignment()
		if err != nil || len(assigned) == 0 {
			return
		}
		if err := c.computeStopAt(assigned); err != nil {
			c.log.Error(context.Background(), "consumer.shouldResume() computeStopAt tick error: %s", err)
			return
		}

		c.mutex.RLock()
		defer c.mutex.RUnlock()

		toResume := make([]kafka.TopicPartition, 0, len(assigned))
		for _, p := range assigned {
			topic, part, err := getInfo(p)
			if err != nil {
				continue
			}
			stop, ok := c.stopAt[topic][part]
			if !ok {
				continue
			}
			cur := c.lastOffset[topic][part]
			if cur < stop {
				toResume = append(toResume, kafka.TopicPartition{Topic: &topic, Partition: part})
			}
		}
		if len(toResume) == 0 {
			return
		}

		if err := c.consumer.Resume(toResume); err != nil {
			c.log.Warn(context.Background(), "consumer.shouldResume() resume error: %s", err)
		} else {
			c.log.Info(context.Background(), "consumer.shouldResume() resumed %+v", toResume)
		}
	default:
	}
}

func (c *consumerImpl) Close() {
	if c.commitTicker != nil {
		c.commitTicker.Stop()
		if err := c.Commit(); err != nil {
			c.log.Info(context.Background(), "consumer.Close() commit error: %s", err)
		}
	}
	if c.gateTicker != nil {
		c.gateTicker.Stop()
	}
	if c.stopChan != nil {
		close(c.stopChan)
		c.stopChan = nil
	}
	if err := c.consumer.Close(); err != nil {
		c.log.Info(context.Background(), "consumer.Close() close error: %s", err)
	}
}
