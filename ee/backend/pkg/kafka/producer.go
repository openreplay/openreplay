package kafka

import (
	"fmt"
	"log"
	"os"

	"gopkg.in/confluentinc/confluent-kafka-go.v1/kafka"
	"openreplay/backend/pkg/env"
)

type Producer struct {
	producer *kafka.Producer
}

func NewProducer(messageSizeLimit int, useBatch bool) *Producer {
	kafkaConfig := &kafka.ConfigMap{
		"enable.idempotence":     true,
		"bootstrap.servers":      env.String("KAFKA_SERVERS"),
		"go.delivery.reports":    true,
		"security.protocol":      "plaintext",
		"go.batch.producer":      useBatch,
		"queue.buffering.max.ms": 100,
		"message.max.bytes":      messageSizeLimit,
	}
	// Apply ssl configuration
	if env.Bool("KAFKA_USE_SSL") {
		kafkaConfig.SetKey("security.protocol", "ssl")
		kafkaConfig.SetKey("ssl.ca.location", os.Getenv("KAFKA_SSL_CA"))
		kafkaConfig.SetKey("ssl.key.location", os.Getenv("KAFKA_SSL_KEY"))
		kafkaConfig.SetKey("ssl.certificate.location", os.Getenv("KAFKA_SSL_CERT"))
	}
	producer, err := kafka.NewProducer(kafkaConfig)
	if err != nil {
		log.Fatalln(err)
	}
	newProducer := &Producer{producer}
	go newProducer.errorHandler()
	return newProducer
}

func (p *Producer) errorHandler() {
	for e := range p.producer.Events() {
		switch ev := e.(type) {
		case *kafka.Message:
			if ev.TopicPartition.Error != nil {
				fmt.Printf("Delivery failed: topicPartition: %v, key: %d\n", ev.TopicPartition, decodeKey(ev.Key))
			}
		}
	}
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
