package kafka

import (
	"fmt"
	"log"
	"os"

        "github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"openreplay/backend/pkg/env"
)

type Producer struct {
	producer *kafka.Producer
}

func NewProducer(messageSizeLimit int, useBatch bool) *Producer {
	kafkaConfig := &kafka.ConfigMap{
		"enable.idempotence":                    true,
		"bootstrap.servers":                     env.String("KAFKA_SERVERS"),
		"go.delivery.reports":                   true,
		"security.protocol":                     "plaintext",
		"go.batch.producer":                     useBatch,
		"message.max.bytes":                     messageSizeLimit, // should be synced with broker config
		"linger.ms":                             1000,
		"queue.buffering.max.ms":                1000,
		"batch.num.messages":                    1000,
		"queue.buffering.max.messages":          1000,
		"retries":                               3,
		"retry.backoff.ms":                      100,
		"max.in.flight.requests.per.connection": 1,
		"compression.type":                      env.String("COMPRESSION_TYPE"),
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

func (p *Producer) ProduceToPartition(topic string, partition, key uint64, value []byte) error {
	p.producer.ProduceChannel() <- &kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: int32(partition)},
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
