# Kafka 2-Node Cluster

## Cluster Status
✅ **Successfully Running**

## Cluster Configuration

### Node 1 (kafka-1)
- **Node ID**: 1
- **Role**: Broker + Controller (Follower)
- **Ports**: 
  - Broker: 9092 (mapped to host:9092)
  - Controller: 9093 (mapped to host:9093)
- **Data Directory**: /bitnami/kafka
- **User**: 1001

### Node 2 (kafka-2)
- **Node ID**: 2
- **Role**: Broker + Controller (Leader)
- **Ports**: 
  - Broker: 9092 (mapped to host:9094)
  - Controller: 9093 (mapped to host:9095)
- **Data Directory**: /bitnami/kafka
- **User**: 1001

## Key Features
- **Kafka Version**: 3.9.0 (pinned to version 3.x)
- **Mode**: KRaft (no ZooKeeper required)
- **Cluster ID**: Sjg_Rr1iQbO9xpahgDbYpQ
- **Replication**: Fully functional across both nodes
- **Network**: kafka-network (bridge)

## Testing the Cluster

### Create a topic
```bash
podman exec kafka-1 /usr/lib/kafka/bin/kafka-topics.sh \
  --create --topic my-topic \
  --bootstrap-server kafka-1:9092 \
  --replication-factor 2 --partitions 3
```

### List topics
```bash
podman exec kafka-1 /usr/lib/kafka/bin/kafka-topics.sh \
  --list --bootstrap-server kafka-1:9092
```

### Produce messages
```bash
podman exec -it kafka-1 /usr/lib/kafka/bin/kafka-console-producer.sh \
  --topic my-topic --bootstrap-server kafka-1:9092
```

### Consume messages
```bash
podman exec -it kafka-2 /usr/lib/kafka/bin/kafka-console-consumer.sh \
  --topic my-topic --from-beginning --bootstrap-server kafka-2:9092
```

## Management Commands

### Check cluster brokers
```bash
podman exec kafka-1 /usr/lib/kafka/bin/kafka-broker-api-versions.sh \
  --bootstrap-server kafka-1:9092
```

### View cluster status
```bash
podman ps | grep kafka
```

### View logs
```bash
podman logs kafka-1
podman logs kafka-2
```

### Stop cluster
```bash
podman stop kafka-1 kafka-2
```

### Start cluster
```bash
podman start kafka-1 kafka-2
```

### Remove cluster
```bash
podman stop kafka-1 kafka-2
podman rm kafka-1 kafka-2
podman volume rm kafka-1-data kafka-2-data
podman network rm kafka-network
```
