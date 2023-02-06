package kafka

import (
	"fmt"
	"log"

	"github.com/confluentinc/confluent-kafka-go/kafka"
)

func logPartitions(s string, prts []kafka.TopicPartition) {
	for _, p := range prts {
		s = fmt.Sprintf("%v | %v", s, p.Partition)
	}
	log.Println(s)
}
