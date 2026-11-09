package kafka

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"openreplay/backend/pkg/env"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

const (
	queueFullBackoff      = 100 * time.Millisecond
	retireFlushTimeoutMs  = 5000
	deliveryQueueCapacity = 10000
)

type Producer struct {
	config     kafka.ConfigMap
	mu         sync.RWMutex
	producer   *kafka.Producer
	deliveries chan kafka.Event
	closed     bool
}

func NewProducer(messageSizeLimit int, useBatch bool) *Producer {
	kafkaConfig := kafka.ConfigMap{
		"enable.idempotence":                    true,
		"bootstrap.servers":                     env.String("KAFKA_SERVERS"),
		"go.delivery.reports":                   env.Bool("KAFKA_DELIVERY_REPORTS"),
		"go.delivery.report.fields":             "key",
		"security.protocol":                     "plaintext",
		"go.batch.producer":                     useBatch,
		"message.max.bytes":                     messageSizeLimit, // should be synced with broker config
		"linger.ms":                             1000,
		"queue.buffering.max.ms":                1000,
		"batch.num.messages":                    1000,
		"queue.buffering.max.messages":          50000,
		"queue.buffering.max.kbytes":            131072, // 128 MiB un-acked buffer cap (default 1 GiB)
		"retry.backoff.ms":                      100,
		"max.in.flight.requests.per.connection": 1,
		"topic.metadata.refresh.interval.ms":    30000,  // learn a new partition leader within seconds after a silent broker disconnect (default 5m)
		"message.timeout.ms":                    600000, // must stay well above the metadata refresh interval, otherwise a retried batch loses messages and the idempotent producer goes fatal
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

	p := &Producer{config: kafkaConfig}
	producer, deliveries, err := p.newInstance()
	if err != nil {
		log.Fatalln(err)
	}
	p.producer, p.deliveries = producer, deliveries
	return p
}

// kafka.NewProducer strips the go.* keys from the map it is given, so every instance gets its own copy.
func (p *Producer) newInstance() (*kafka.Producer, chan kafka.Event, error) {
	conf := make(kafka.ConfigMap, len(p.config))
	for k, v := range p.config {
		conf[k] = v
	}
	producer, err := kafka.NewProducer(&conf)
	if err != nil {
		return nil, nil, err
	}
	deliveries := make(chan kafka.Event, deliveryQueueCapacity)
	go p.errorHandler(producer)
	go p.ackHandler(deliveries)
	return producer, deliveries, nil
}

func (p *Producer) recreate(failed *kafka.Producer) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.producer != failed {
		return nil
	}
	fresh, deliveries, err := p.newInstance()
	if err != nil {
		return err
	}
	log.Printf("kafka producer recreated after fatal error: %v\n", failed.GetFatalError())
	go retire(failed, p.deliveries)
	p.producer, p.deliveries = fresh, deliveries
	return nil
}

func retire(producer *kafka.Producer, deliveries chan kafka.Event) {
	producer.Flush(retireFlushTimeoutMs)
	producer.Close()
	close(deliveries)
}

func (p *Producer) errorHandler(producer *kafka.Producer) {
	for e := range producer.Events() {
		switch ev := e.(type) {
		case *kafka.Message:
			if ev.TopicPartition.Error != nil {
				fmt.Printf("Delivery failed: topicPartition: %v, key: %d\n", ev.TopicPartition, decodeKey(ev.Key))
			}
		case kafka.Error:
			if ev.IsFatal() {
				log.Printf("kafka producer entered fatal state: %v\n", ev)
			}
		}
	}
}

func (p *Producer) ackHandler(deliveries chan kafka.Event) {
	for e := range deliveries {
		msg, ok := e.(*kafka.Message)
		if !ok {
			continue
		}
		ack, ok := msg.Opaque.(func(error))
		if !ok {
			continue
		}
		if msg.TopicPartition.Error != nil {
			fmt.Printf("Delivery failed: topicPartition: %v, key: %d\n", msg.TopicPartition, decodeKey(msg.Key))
		}
		ack(msg.TopicPartition.Error)
	}
}

func (p *Producer) produce(msg *kafka.Message) (*kafka.Producer, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	if p.closed {
		return nil, errors.New("kafka producer is closed")
	}
	var deliveries chan kafka.Event
	if msg.Opaque != nil {
		deliveries = p.deliveries
	}
	return p.producer, p.producer.Produce(msg, deliveries)
}

func (p *Producer) produceWithRetry(msg *kafka.Message) error {
	recreated := false
	for {
		producer, err := p.produce(msg)
		if err == nil {
			return nil
		}
		var kErr kafka.Error
		if !errors.As(err, &kErr) {
			return err
		}
		switch kErr.Code() {
		case kafka.ErrQueueFull:
			time.Sleep(queueFullBackoff)
		case kafka.ErrFatal:
			if recreated {
				return producer.GetFatalError()
			}
			if err := p.recreate(producer); err != nil {
				return fmt.Errorf("producer is fatal and can't be recreated: %w", err)
			}
			recreated = true
		default:
			return err
		}
	}
}

func (p *Producer) Produce(topic string, key uint64, value []byte) error {
	return p.produceWithRetry(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: getKeyPartition(key)},
		Key:            encodeKey(key),
		Value:          value,
	})
}

func (p *Producer) ProduceWithAck(topic string, key uint64, value []byte, ack func(error)) error {
	return p.produceWithRetry(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: getKeyPartition(key)},
		Key:            encodeKey(key),
		Value:          value,
		Opaque:         ack,
	})
}

func (p *Producer) ProduceToPartition(topic string, partition, key uint64, value []byte) error {
	return p.produceWithRetry(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: int32(partition)},
		Key:            encodeKey(key),
		Value:          value,
	})
}

func (p *Producer) Ping(ctx context.Context) error {
	p.mu.RLock()
	defer p.mu.RUnlock()
	if p.closed {
		return errors.New("kafka producer is closed")
	}
	if err := p.producer.GetFatalError(); err != nil {
		return err
	}
	timeoutMs := 5000
	if deadline, ok := ctx.Deadline(); ok {
		if ms := int(time.Until(deadline).Milliseconds()); ms > 0 {
			timeoutMs = ms
		}
	}
	_, err := p.producer.GetMetadata(nil, true, timeoutMs)
	return err
}

func (p *Producer) Close(timeoutMs int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.closed {
		return
	}
	p.closed = true
	p.producer.Flush(timeoutMs)
	p.producer.Close()
	close(p.deliveries)
}

func (p *Producer) Flush(timeoutMs int) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	if p.closed {
		return
	}
	p.producer.Flush(timeoutMs)
}
