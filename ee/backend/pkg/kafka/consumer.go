package kafka

import (
	"log"
	"os"
	// "os/signal"
	// "syscall"
	"time"

	"github.com/pkg/errors"

	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/queue/types"
	"gopkg.in/confluentinc/confluent-kafka-go.v1/kafka"
)

type Message = kafka.Message

type Consumer struct {
	c              *kafka.Consumer
	messageHandler types.MessageHandler
	commitTicker  *time.Ticker
	pollTimeout    uint

	lastKafkaEventTs int64
}

func NewConsumer(group string, topics []string, messageHandler types.MessageHandler) *Consumer {
	protocol := "plaintext"
	if env.Bool("KAFKA_USE_SSL") {
		protocol = "ssl"
	}
	c, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers":               env.String("KAFKA_SERVERS"),
		"group.id":                        group,
		"auto.offset.reset":               "earliest",
		"enable.auto.commit":              "false",
		"security.protocol":               protocol,
		"go.application.rebalance.enable": true,
	})
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

	return &Consumer{
		c:              c,
		messageHandler: messageHandler,
		commitTicker: time.NewTicker(2 * time.Minute),
		pollTimeout:    200,
	}
}

func (consumer *Consumer) DisableAutoCommit() {
	consumer.commitTicker.Stop()
}


func (consumer *Consumer) Commit() error {
	consumer.c.Commit() // TODO: return error if it is not "No offset stored"
	return nil
}

func (consumer *Consumer)	CommitAtTimestamp(commitTs int64) error {
	assigned, err := consumer.c.Assignment()
	if err != nil {
		return err
	}
	logPartitions("Actually assigned:", assigned)

	var timestamps []kafka.TopicPartition
	for _, p := range assigned { // p is a copy here sinse partition is not a pointer
		p.Offset = kafka.Offset(commitTs)
		timestamps = append(timestamps, p)
	}
	offsets, err := consumer.c.OffsetsForTimes(timestamps, 2000)
	if err != nil { 
		return errors.Wrap(err, "Kafka Consumer back commit error")
	}

	// Limiting to already committed
	committed, err := consumer.c.Committed(assigned, 2000) // memorise?
	logPartitions("Actually committed:",committed)
	if err != nil {
		return errors.Wrap(err, "Kafka Consumer retrieving committed error")
	}
	for _, offs := range offsets {
		for _, comm := range committed {
			if comm.Offset == kafka.OffsetStored || 
				comm.Offset == kafka.OffsetInvalid ||
				comm.Offset == kafka.OffsetBeginning  ||
				comm.Offset == kafka.OffsetEnd { continue }
			if comm.Partition == offs.Partition && 
				(comm.Topic != nil && offs.Topic != nil && *comm.Topic == *offs.Topic) &&
				comm.Offset > offs.Offset  {
				offs.Offset = comm.Offset
			}
		}
	}

	// TODO: check per-partition errors: offsets[i].Error 
	_, err = consumer.c.CommitOffsets(offsets)
	return errors.Wrap(err, "Kafka Consumer back commit error")
}


func (consumer *Consumer)	CommitBack(gap int64) error {
	if consumer.lastKafkaEventTs == 0 {
		return nil
	}
	commitTs := consumer.lastKafkaEventTs - gap
	return consumer.CommitAtTimestamp(commitTs)
}

func (consumer *Consumer) ConsumeNext() error {
	ev := consumer.c.Poll(int(consumer.pollTimeout))
	if ev == nil {
		return nil
	}

	select {
	case <-consumer.commitTicker.C:
		consumer.Commit()
	default:
	}

	switch e := ev.(type) {
		case *kafka.Message:
			if e.TopicPartition.Error != nil {
				return errors.Wrap(e.TopicPartition.Error, "Consumer Partition Error")
			}
			ts := e.Timestamp.UnixNano()/ 1e6
			consumer.messageHandler(decodeKey(e.Key), e.Value, &types.Meta{
				Topic: *(e.TopicPartition.Topic),
				ID: uint64(e.TopicPartition.Offset),
				Timestamp: ts,
			})
			consumer.lastKafkaEventTs = ts
		// case kafka.AssignedPartitions:
		// 	logPartitions("Kafka Consumer: Partitions Assigned", e.Partitions)
		// 	consumer.partitions = e.Partitions
		// 	consumer.c.Assign(e.Partitions)
		// 	log.Printf("Actually partitions assigned!")
		// case kafka.RevokedPartitions:
		// 	log.Println("Kafka Cosumer: Partitions Revoked")
		// 	consumer.partitions = nil
		// 	consumer.c.Unassign()
		case kafka.Error:
			if e.Code() == kafka.ErrAllBrokersDown {
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



// func (consumer *Consumer) consume(
// 	message func(m *kafka.Message) error,
// 	commit func(c *kafka.Consumer) error,
// ) error {
// 	if err := consumer.c.Subscribe(consumer.topic, nil); err != nil {
// 		return err
// 	}
// 	defer consumer.close()
// 	sigchan := make(chan os.Signal, 1)
// 	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
// 	ticker := time.NewTicker(consumer.commitInterval)
// 	defer ticker.Stop()
// 	for {
// 		select {
// 		case <-sigchan:
// 			return commit(consumer.c)
// 		case <-ticker.C:
// 			if err := commit(consumer.c); err != nil {
// 				return err
// 			}
// 		default:
// 			ev := consumer.c.Poll(consumer.pollTimeout)
// 			if ev == nil {
// 				continue
// 			}
// 			switch e := ev.(type) {
// 			case *kafka.Message:
// 				if e.TopicPartition.Error != nil {
// 					log.Println(e.TopicPartition.Error)
// 					continue
// 				}
// 				if err := message(e); err != nil {
// 					return err
// 				}
// 			case kafka.AssignedPartitions:
// 				if err := consumer.c.Assign(e.Partitions); err != nil {
// 					return err
// 				}
// 			case kafka.RevokedPartitions:
// 				if err := commit(consumer.c); err != nil {
// 					return err
// 				}
// 				if err := consumer.c.Unassign(); err != nil {
// 					return err
// 				}
// 			case kafka.Error:
// 				log.Println(e)
// 				if e.Code() == kafka.ErrAllBrokersDown {
// 					return e
// 				}
// 			}
// 		}
// 	}
// }


// func (consumer *Consumer) Consume(
// 	message func(key uint64, value []byte) error,
// ) error {
// 	return consumer.consume(
// 		func(m *kafka.Message) error {
// 			return message(decodeKey(m.Key), m.Value)
// 		},
// 		func(c *kafka.Consumer) error {
// 			if _, err := c.Commit(); err != nil {
// 				log.Println(err)
// 			}
// 			return nil
// 		},
// 	)
// }

// func (consumer *Consumer) ConsumeWithCommitHook(
// 	message func(key uint64, value []byte) error,
// 	commit func() error,
// ) error {
// 	return consumer.consume(
// 		func(m *kafka.Message) error {
// 			return message(decodeKey(m.Key), m.Value)
// 		},
// 		func(c *kafka.Consumer) error {
// 			if err := commit(); err != nil {
// 				return err
// 			}
// 			if _, err := c.Commit(); err != nil {
// 				log.Println(err)
// 			}
// 			return nil
// 		},
// 	)
// }
