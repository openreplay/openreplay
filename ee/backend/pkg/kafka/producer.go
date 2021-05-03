package kafka

import (
	"log"

	"openreplay/backend/pkg/env"
	"gopkg.in/confluentinc/confluent-kafka-go.v1/kafka"
)

type Producer struct {
	producer *kafka.Producer
}

func NewProducer() *Producer {
	protocol := "plaintext"
	if env.Bool("KAFKA_USE_SSL") {
		protocol = "ssl"
	}
	producer, err := kafka.NewProducer(&kafka.ConfigMap{
		"enable.idempotence":     true, // TODO: get rid of
		"bootstrap.servers":      env.String("KAFKA_SERVERS"),
		"go.delivery.reports":    false,
		"security.protocol":      protocol,
		"go.batch.producer":      true,
		"queue.buffering.max.ms": 100,
	})
	if err != nil {
		log.Fatalln(err)
	}
	return &Producer{producer}
}

func (p *Producer) Produce(topic string, key uint64, value []byte) error {
	p.producer.ProduceChannel() <- &kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: getKeyPartition(key)},
		Key:            encodeKey(key),
		Value:          value,
	}
	return nil
}

func (p *Producer) Close(timeoutMs int) {
	p.producer.Flush(timeoutMs)
	p.producer.Close()
}

func (p *Producer) Flush(timeoutMs int) {
	p.producer.Flush(timeoutMs)
}

// MBTODO: GetFatalError check
