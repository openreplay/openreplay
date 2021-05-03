package kafka

import (
	"log"
	"fmt"

	"gopkg.in/confluentinc/confluent-kafka-go.v1/kafka"
)


func logPartitions(s string, prts []kafka.TopicPartition) {
	for _, p := range prts {
		s = fmt.Sprintf("%v | %v", s, p.Partition)
	}
	log.Println(s)
}