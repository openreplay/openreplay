# Extending Kafka Configuration

This guide shows how to customize Kafka settings like message size, retention, compression, and more.

## Quick Examples

### Example 1: Increase Message Size Limit

Add to your docker-compose.yml:

```yaml
services:
  kafka-1:
    environment:
      # ... existing config ...
      
      # Allow messages up to 10MB (default is 1MB)
      KAFKA_MESSAGE_MAX_BYTES: "10485760"
      KAFKA_REPLICA_FETCH_MAX_BYTES: "10485760"
```

**Important:** Also configure your producers/consumers with matching `max.request.size` and `fetch.max.bytes`.

### Example 2: Change Retention Policy

```yaml
services:
  kafka-1:
    environment:
      # ... existing config ...
      
      # Keep messages for 7 days (default is 7 days = 168 hours)
      KAFKA_LOG_RETENTION_HOURS: "168"
      
      # Or limit by size: keep max 10GB per topic partition
      KAFKA_LOG_RETENTION_BYTES: "10737418240"
      
      # Size of log segments (default 1GB)
      KAFKA_LOG_SEGMENT_BYTES: "1073741824"
```

### Example 3: Enable Compression

```yaml
services:
  kafka-1:
    environment:
      # ... existing config ...
      
      # Compress messages (options: gzip, snappy, lz4, zstd, uncompressed)
      KAFKA_COMPRESSION_TYPE: "lz4"
```

### Example 4: Performance Tuning

```yaml
services:
  kafka-1:
    environment:
      # ... existing config ...
      
      # Network threads (handles network requests)
      KAFKA_CFG_NUM_NETWORK_THREADS: "8"
      
      # I/O threads (handles disk operations)
      KAFKA_CFG_NUM_IO_THREADS: "8"
      
      # Socket buffer sizes
      KAFKA_CFG_SOCKET_SEND_BUFFER_BYTES: "102400"
      KAFKA_CFG_SOCKET_RECEIVE_BUFFER_BYTES: "102400"
      KAFKA_CFG_SOCKET_REQUEST_MAX_BYTES: "104857600"
      
      # Replication settings
      KAFKA_CFG_NUM_REPLICA_FETCHERS: "4"
      KAFKA_CFG_REPLICA_LAG_TIME_MAX_MS: "30000"
```

## Three Ways to Configure

### 1. Named Environment Variables (Easiest)

For common settings, use specific environment variables:

```yaml
environment:
  KAFKA_MESSAGE_MAX_BYTES: "10485760"
  KAFKA_REPLICA_FETCH_MAX_BYTES: "10485760"
  KAFKA_LOG_RETENTION_HOURS: "168"
  KAFKA_COMPRESSION_TYPE: "lz4"
```

**Supported variables:**
- `KAFKA_MESSAGE_MAX_BYTES` - Max message size
- `KAFKA_REPLICA_FETCH_MAX_BYTES` - Max replica fetch size
- `KAFKA_LOG_RETENTION_HOURS` - Retention time in hours
- `KAFKA_LOG_RETENTION_BYTES` - Retention size limit
- `KAFKA_LOG_SEGMENT_BYTES` - Segment file size
- `KAFKA_COMPRESSION_TYPE` - Compression algorithm

### 2. Generic KAFKA_CFG_ Prefix (Most Flexible)

For ANY Kafka property, use `KAFKA_CFG_` prefix with uppercase and underscores:

```yaml
environment:
  # num.network.threads=8
  KAFKA_CFG_NUM_NETWORK_THREADS: "8"
  
  # min.insync.replicas=2
  KAFKA_CFG_MIN_INSYNC_REPLICAS: "2"
  
  # auto.create.topics.enable=false
  KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: "false"
  
  # log.flush.interval.messages=10000
  KAFKA_CFG_LOG_FLUSH_INTERVAL_MESSAGES: "10000"
```

**Pattern:** Replace dots with underscores, convert to uppercase, add `KAFKA_CFG_` prefix.

Examples:
- `num.network.threads` → `KAFKA_CFG_NUM_NETWORK_THREADS`
- `min.insync.replicas` → `KAFKA_CFG_MIN_INSYNC_REPLICAS`
- `auto.create.topics.enable` → `KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE`

### 3. Custom server.properties File (Advanced)

Mount your own configuration file:

```yaml
services:
  kafka-1:
    volumes:
      - ./custom-server.properties:/tmp/custom.properties:ro
    environment:
      KAFKA_CONFIG_FILE: /tmp/custom.properties
```

Then modify start-kafka.sh to support `KAFKA_CONFIG_FILE`.

## Complete Example: Production-Ready Configuration

```yaml
version: '3.8'

services:
  kafka-1:
    build: .
    container_name: kafka-1-prod
    hostname: kafka-1
    ports:
      - "9092:9092"
      - "9093:9093"
      - "9094:9094"
    environment:
      # Cluster config
      KAFKA_NODE_ID: 1
      KAFKA_CLUSTER_ID: "Sjg_Rr1iQbO9xpahgDbYpQ"
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093,SSL://:9094
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-1:9092,SSL://kafka-1:9094
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT,SSL:SSL
      KAFKA_LOG_DIRS: /bitnami/kafka/data
      LOG_DIR: /bitnami/kafka/logs
      
      # TLS config
      KAFKA_SSL_CERT_FILE: /bitnami/kafka/certs/kafka-1-cert.pem
      KAFKA_SSL_KEY_FILE: /bitnami/kafka/certs/kafka-1-key.pem
      KAFKA_SSL_CA_FILE: /bitnami/kafka/certs/ca-cert.pem
      KAFKA_SSL_CLIENT_AUTH: required
      KAFKA_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM: ""
      
      # === CUSTOM CONFIGURATIONS ===
      
      # Message size (10MB)
      KAFKA_MESSAGE_MAX_BYTES: "10485760"
      KAFKA_REPLICA_FETCH_MAX_BYTES: "10485760"
      
      # Retention (30 days)
      KAFKA_LOG_RETENTION_HOURS: "720"
      KAFKA_LOG_SEGMENT_BYTES: "1073741824"
      
      # Compression
      KAFKA_COMPRESSION_TYPE: "lz4"
      
      # Performance tuning
      KAFKA_CFG_NUM_NETWORK_THREADS: "8"
      KAFKA_CFG_NUM_IO_THREADS: "8"
      KAFKA_CFG_SOCKET_SEND_BUFFER_BYTES: "102400"
      KAFKA_CFG_SOCKET_RECEIVE_BUFFER_BYTES: "102400"
      
      # Replication
      KAFKA_CFG_MIN_INSYNC_REPLICAS: "2"
      KAFKA_CFG_DEFAULT_REPLICATION_FACTOR: "2"
      KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR: "2"
      
      # Security
      KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: "false"
      
    volumes:
      - kafka-1-data:/bitnami/kafka
      - ./certs:/bitnami/kafka/certs:ro
    networks:
      - kafka-network

volumes:
  kafka-1-data:

networks:
  kafka-network:
    driver: bridge
```

## Common Configuration Scenarios

### High-Throughput / Large Messages

```yaml
environment:
  # Allow 50MB messages
  KAFKA_MESSAGE_MAX_BYTES: "52428800"
  KAFKA_REPLICA_FETCH_MAX_BYTES: "52428800"
  
  # Increase buffers
  KAFKA_CFG_SOCKET_SEND_BUFFER_BYTES: "1048576"
  KAFKA_CFG_SOCKET_RECEIVE_BUFFER_BYTES: "1048576"
  KAFKA_CFG_SOCKET_REQUEST_MAX_BYTES: "104857600"
  
  # More I/O threads
  KAFKA_CFG_NUM_IO_THREADS: "16"
  
  # Use compression
  KAFKA_COMPRESSION_TYPE: "lz4"
```

**Client configuration needed:**
```properties
max.request.size=52428800
buffer.memory=67108864
```

### Long-Term Storage

```yaml
environment:
  # Keep messages for 1 year
  KAFKA_LOG_RETENTION_HOURS: "8760"
  
  # Or unlimited retention
  KAFKA_LOG_RETENTION_HOURS: "-1"
  
  # Compact old segments
  KAFKA_CFG_LOG_CLEANUP_POLICY: "compact,delete"
  KAFKA_CFG_LOG_CLEANER_ENABLE: "true"
```

### Low-Latency / Real-Time

```yaml
environment:
  # Flush frequently
  KAFKA_CFG_LOG_FLUSH_INTERVAL_MESSAGES: "1"
  KAFKA_CFG_LOG_FLUSH_INTERVAL_MS: "1"
  
  # Smaller segments
  KAFKA_LOG_SEGMENT_BYTES: "268435456"  # 256MB
  
  # More network threads
  KAFKA_CFG_NUM_NETWORK_THREADS: "16"
  
  # No compression
  KAFKA_COMPRESSION_TYPE: "uncompressed"
```

**Warning:** Frequent flushing reduces throughput. Use only if latency is critical.

### Disaster Recovery / High Availability

```yaml
environment:
  # Require 2 in-sync replicas
  KAFKA_CFG_MIN_INSYNC_REPLICAS: "2"
  
  # All topics have 3 replicas by default
  KAFKA_CFG_DEFAULT_REPLICATION_FACTOR: "3"
  
  # Internal topics also replicated
  KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR: "3"
  KAFKA_CFG_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: "3"
  KAFKA_CFG_TRANSACTION_STATE_LOG_MIN_ISR: "2"
  
  # Longer broker timeout
  KAFKA_CFG_REPLICA_LAG_TIME_MAX_MS: "30000"
```

## Viewing Current Configuration

After starting Kafka, verify your configuration:

```bash
# View the generated server.properties
podman exec kafka-1 cat /tmp/server.properties

# Check specific property
podman exec kafka-1 grep "message.max.bytes" /tmp/server.properties

# View broker configs via Kafka tools
podman exec kafka-1 /usr/lib/kafka/bin/kafka-configs.sh \
  --bootstrap-server localhost:9092 \
  --entity-type brokers \
  --entity-name 1 \
  --describe
```

## All Available Kafka Properties

For a complete list of Kafka broker configurations, see:
https://kafka.apache.org/documentation/#brokerconfigs

Common categories:
- **Message/Request Size:** `message.max.bytes`, `replica.fetch.max.bytes`
- **Retention:** `log.retention.{hours,bytes,ms}`, `log.segment.bytes`
- **Replication:** `min.insync.replicas`, `replica.lag.time.max.ms`
- **Performance:** `num.{network,io}.threads`, `socket.{send,receive}.buffer.bytes`
- **Compression:** `compression.type`
- **Security:** `auto.create.topics.enable`, `authorizer.class.name`
- **Monitoring:** `metric.reporters`, `kafka.metrics.reporters`

## Troubleshooting

### Configuration not applied

1. Check logs for syntax errors:
   ```bash
   podman logs kafka-1 | grep -i error
   ```

2. Verify environment variables are set:
   ```bash
   podman exec kafka-1 env | grep KAFKA
   ```

3. Check generated config file:
   ```bash
   podman exec kafka-1 cat /tmp/server.properties
   ```

### Message too large errors

If you get "MessageSizeTooLargeException":

1. Increase broker setting: `KAFKA_MESSAGE_MAX_BYTES`
2. Increase producer setting: `max.request.size`
3. Increase consumer setting: `fetch.max.bytes`
4. All three must be aligned!

### Retention not working

Check both time and size limits:
```yaml
# Either condition triggers deletion
KAFKA_LOG_RETENTION_HOURS: "168"      # Delete after 7 days
KAFKA_LOG_RETENTION_BYTES: "10737418240"  # Delete when > 10GB
```

Set to `-1` for unlimited retention.
