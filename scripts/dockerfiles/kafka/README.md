# Kafka Docker Setup

A simplified, production-ready Kafka cluster with optional TLS/SSL support.

## Features

- **Kafka 3.x** on Chainguard Wolfi base (minimal, secure)
- **KRaft mode** - No ZooKeeper required
- **Simple TLS configuration** - Automatic PEM to JKS conversion
- **2-node cluster** with replication support
- **Flexible configuration** - Easy customization via environment variables

## Quick Start

### Basic Cluster (PLAINTEXT)

```bash
# Build and start
podman-compose up -d

# Test it works
podman exec kafka-1 /usr/lib/kafka/bin/kafka-topics.sh \
  --create --topic test \
  --bootstrap-server kafka-1:9092
```

### TLS-Enabled Cluster

```bash
# Generate certificates
./generate-certs.sh

# Start with TLS
podman-compose -f docker-compose-tls.yml up -d
```

### Custom Configuration (Message Size, Retention, etc.)

```bash
# Start with custom settings
podman-compose -f docker-compose-custom.yml up -d
```

See [CUSTOM_CONFIG.md](CUSTOM_CONFIG.md) for detailed configuration options.

## Deployment Options

### Docker Compose

| File | Description | Use Case |
|------|-------------|----------|
| `docker-compose.yml` | Basic PLAINTEXT cluster | Development, testing |
| `docker-compose-tls.yml` | PLAINTEXT + SSL listeners | Production with TLS |
| `docker-compose-custom.yml` | Custom configuration example | High throughput, large messages |

### Kubernetes

| File | Description | Use Case |
|------|-------------|----------|
| `k8s-kafka-kraft.yaml` | KRaft StatefulSet (PLAINTEXT) | K8s development/testing |
| `k8s-kafka-kraft-tls.yaml` | KRaft StatefulSet (TLS) | K8s production |
| `k8s-generate-certs.sh` | Generate K8s TLS certificates | TLS setup |

**Quick Start Kubernetes:**
```bash
kubectl create namespace db
kubectl apply -f k8s-kafka-kraft.yaml
```

See [K8S_QUICK_START.md](K8S_QUICK_START.md) and [K8S_DEPLOYMENT.md](K8S_DEPLOYMENT.md) for details.

## Ports

### Standard Cluster
- **kafka-1**: 9092 (PLAINTEXT), 9093 (CONTROLLER)
- **kafka-2**: 9094 (PLAINTEXT), 9095 (CONTROLLER)

### TLS Cluster
- **kafka-1**: 9092 (PLAINTEXT), 9093 (CONTROLLER), 9094 (SSL)
- **kafka-2**: 9095 (PLAINTEXT), 9096 (CONTROLLER), 9097 (SSL)

## Documentation

- **[TLS_SETUP.md](TLS_SETUP.md)** - Complete TLS configuration guide
- **[CUSTOM_CONFIG.md](CUSTOM_CONFIG.md)** - Customize Kafka settings (message size, retention, etc.)
- **[CLUSTER_INFO.md](CLUSTER_INFO.md)** - Cluster status and testing commands
- **[CONNECTION_GUIDE.md](CONNECTION_GUIDE.md)** - How to connect from applications
- **[INSECURE_TLS.md](INSECURE_TLS.md)** - Development TLS without certificate verification

## Common Customizations

### Increase Message Size Limit

Add to docker-compose.yml:

```yaml
environment:
  KAFKA_MESSAGE_MAX_BYTES: "10485760"  # 10MB
  KAFKA_REPLICA_FETCH_MAX_BYTES: "10485760"
```

### Change Retention Period

```yaml
environment:
  KAFKA_LOG_RETENTION_HOURS: "720"  # 30 days
```

### Enable Compression

```yaml
environment:
  KAFKA_COMPRESSION_TYPE: "lz4"
```

### Generic Property Configuration

Any Kafka property can be set using `KAFKA_CFG_` prefix:

```yaml
environment:
  # num.network.threads=8
  KAFKA_CFG_NUM_NETWORK_THREADS: "8"
  
  # auto.create.topics.enable=false
  KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: "false"
```

See [CUSTOM_CONFIG.md](CUSTOM_CONFIG.md) for complete examples.

## Management Commands

### Build image

```bash
make build
```

### View logs

```bash
podman logs kafka-1
podman logs kafka-2
```

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

### View broker configuration

```bash
podman exec kafka-1 cat /tmp/server.properties
```

## TLS Quick Reference

**Generate certificates:**
```bash
./generate-certs.sh
```

**Start TLS cluster:**
```bash
podman-compose -f docker-compose-tls.yml up -d
```

**Test SSL connection:**
```bash
# Create client config
cat > client-ssl.properties << EOF
security.protocol=SSL
ssl.truststore.location=/bitnami/kafka/certs/ca-cert.pem
ssl.truststore.type=PEM
EOF

# List topics via SSL
podman exec kafka-1-tls /usr/lib/kafka/bin/kafka-topics.sh \
  --list --bootstrap-server kafka-1:9094 \
  --command-config client-ssl.properties
```

## Architecture

- **Base Image**: Chainguard Wolfi (minimal, secure, no CVEs)
- **Kafka Version**: 3.x (pinned to major version)
- **Mode**: KRaft (no ZooKeeper)
- **Cluster ID**: Shared across nodes for multi-broker setup
- **User**: Non-root (UID 1001)
- **Data Directory**: `/bitnami/kafka/data`
- **Log Directory**: `/bitnami/kafka/logs`

## Environment Variables

### Required (Cluster Mode)

| Variable | Description | Example |
|----------|-------------|---------|
| `KAFKA_NODE_ID` | Unique node identifier | `1` |
| `KAFKA_CLUSTER_ID` | Shared cluster UUID | `Sjg_Rr1iQbO9xpahgDbYpQ` |
| `KAFKA_PROCESS_ROLES` | Node roles | `broker,controller` |
| `KAFKA_LISTENERS` | Listener definitions | `PLAINTEXT://:9092,CONTROLLER://:9093` |
| `KAFKA_ADVERTISED_LISTENERS` | Public listener addresses | `PLAINTEXT://kafka-1:9092` |
| `KAFKA_CONTROLLER_QUORUM_VOTERS` | Controller nodes | `1@kafka-1:9093,2@kafka-2:9093` |

### TLS Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `KAFKA_SSL_CERT_FILE` | Server certificate path | `/path/to/cert.pem` |
| `KAFKA_SSL_KEY_FILE` | Private key path | `/path/to/key.pem` |
| `KAFKA_SSL_CA_FILE` | CA certificate path (optional) | `/path/to/ca-cert.pem` |
| `KAFKA_SSL_CLIENT_AUTH` | Client authentication mode | `required` |

### Custom Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `KAFKA_MESSAGE_MAX_BYTES` | Max message size | `10485760` (10MB) |
| `KAFKA_REPLICA_FETCH_MAX_BYTES` | Max replica fetch size | `10485760` |
| `KAFKA_LOG_RETENTION_HOURS` | Retention time | `720` (30 days) |
| `KAFKA_LOG_RETENTION_BYTES` | Retention size limit | `10737418240` (10GB) |
| `KAFKA_COMPRESSION_TYPE` | Compression algorithm | `lz4` |
| `KAFKA_CFG_*` | Any Kafka property | `KAFKA_CFG_NUM_NETWORK_THREADS=8` |

See [CUSTOM_CONFIG.md](CUSTOM_CONFIG.md) for complete reference.

## Troubleshooting

### Check cluster status

```bash
podman ps | grep kafka
```

### View logs

```bash
podman logs kafka-1 | tail -50
```

### Test connectivity

```bash
podman exec kafka-1 /usr/lib/kafka/bin/kafka-broker-api-versions.sh \
  --bootstrap-server kafka-1:9092
```

### Verify configuration

```bash
podman exec kafka-1 cat /tmp/server.properties | grep message.max.bytes
```

### Message too large error

Increase message size limits on both broker and client:

**Broker:**
```yaml
environment:
  KAFKA_MESSAGE_MAX_BYTES: "10485760"
```

**Producer:**
```properties
max.request.size=10485760
```

**Consumer:**
```properties
fetch.max.bytes=10485760
```

## Production Checklist

- [ ] Use CA-signed certificates (not self-signed)
- [ ] Enable hostname verification for TLS
- [ ] Use SSL for inter-broker communication
- [ ] Set appropriate message size limits
- [ ] Configure retention policies
- [ ] Adjust performance settings (threads, buffers)
- [ ] Disable auto-topic creation
- [ ] Set up monitoring (JMX, Prometheus)
- [ ] Configure log aggregation
- [ ] Implement backup strategy
- [ ] Use secrets management for certificates

## Links

- **Kafka Documentation**: https://kafka.apache.org/documentation/
- **Broker Configs**: https://kafka.apache.org/documentation/#brokerconfigs
- **KRaft Mode**: https://kafka.apache.org/documentation/#kraft
