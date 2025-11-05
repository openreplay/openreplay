# Kafka Connection Guide

## Overview

This guide shows how to connect to the Kafka cluster from another container or application.

## Connection Methods

### 1. PLAINTEXT Connection (No Encryption)

**Ports:**
- kafka-1: 9092
- kafka-2: 9095 (mapped from internal 9092)

**Configuration:**

```properties
bootstrap.servers=kafka-1:9092,kafka-2:9092
# Or from host machine:
# bootstrap.servers=localhost:9092,localhost:9095
```

**Example - List Topics:**

```bash
kafka-topics.sh --list --bootstrap-server kafka-1:9092
```

### 2. SSL Connection (Encrypted)

**Ports:**
- kafka-1: 9094
- kafka-2: 9097 (mapped from internal 9094)

**Configuration File (ssl-client.properties):**

```properties
bootstrap.servers=kafka-1:9094,kafka-2:9094
security.protocol=SSL
ssl.truststore.location=/path/to/ca-cert.pem
ssl.truststore.type=PEM
ssl.endpoint.identification.algorithm=
```

**Example - List Topics:**

```bash
kafka-topics.sh --list \
  --bootstrap-server kafka-1:9094 \
  --command-config ssl-client.properties
```

## From Another Container

### Start a Client Container

```bash
podman run -d --name kafka-client \
  --network kafka-network-tls \
  -v /path/to/certs:/certs:ro \
  --entrypoint /bin/sh \
  your-kafka-image:latest \
  -c "while true; do sleep 3600; done"
```

### Create SSL Client Config

```bash
podman exec kafka-client sh -c 'cat > /tmp/ssl-client.properties << EOF
security.protocol=SSL
ssl.truststore.location=/certs/ca-cert.pem
ssl.truststore.type=PEM
ssl.endpoint.identification.algorithm=
EOF'
```

### Test Connection

```bash
# PLAINTEXT
podman exec kafka-client kafka-topics.sh --list --bootstrap-server kafka-1:9092

# SSL
podman exec kafka-client kafka-topics.sh --list \
  --bootstrap-server kafka-1:9094 \
  --command-config /tmp/ssl-client.properties
```

## From Host Machine

### PLAINTEXT

```bash
kafka-topics.sh --list --bootstrap-server localhost:9092
```

### SSL

Create `ssl-client.properties`:

```properties
security.protocol=SSL
ssl.truststore.location=/full/path/to/ca-cert.pem
ssl.truststore.type=PEM
ssl.endpoint.identification.algorithm=
```

Then use it:

```bash
kafka-topics.sh --list \
  --bootstrap-server localhost:9094 \
  --command-config ssl-client.properties
```

## Producer/Consumer Examples

### PLAINTEXT Producer

```bash
kafka-console-producer.sh \
  --bootstrap-server kafka-1:9092 \
  --topic my-topic
```

### SSL Producer

```bash
kafka-console-producer.sh \
  --bootstrap-server kafka-1:9094 \
  --topic my-topic \
  --producer.config ssl-client.properties
```

### PLAINTEXT Consumer

```bash
kafka-console-consumer.sh \
  --bootstrap-server kafka-1:9092 \
  --topic my-topic \
  --from-beginning
```

### SSL Consumer

```bash
kafka-console-consumer.sh \
  --bootstrap-server kafka-1:9094 \
  --topic my-topic \
  --from-beginning \
  --consumer.config ssl-client.properties
```

## Application Configuration

### Java/Spring Boot

```yaml
spring:
  kafka:
    bootstrap-servers: kafka-1:9094,kafka-2:9094
    properties:
      security.protocol: SSL
      ssl.truststore.location: /path/to/ca-cert.pem
      ssl.truststore.type: PEM
      ssl.endpoint.identification.algorithm: ""
```

### Python (kafka-python)

```python
from kafka import KafkaProducer, KafkaConsumer

# PLAINTEXT
producer = KafkaProducer(
    bootstrap_servers=['kafka-1:9092', 'kafka-2:9092']
)

# SSL
producer = KafkaProducer(
    bootstrap_servers=['kafka-1:9094', 'kafka-2:9094'],
    security_protocol='SSL',
    ssl_check_hostname=False,
    ssl_cafile='/path/to/ca-cert.pem'
)
```

### Node.js (kafkajs)

```javascript
const { Kafka } = require('kafkajs')

// PLAINTEXT
const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['kafka-1:9092', 'kafka-2:9092']
})

// SSL
const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['kafka-1:9094', 'kafka-2:9094'],
  ssl: {
    rejectUnauthorized: false,
    ca: [fs.readFileSync('/path/to/ca-cert.pem', 'utf-8')]
  }
})
```

### Go (sarama)

```go
import (
    "crypto/tls"
    "crypto/x509"
    "io/ioutil"
    "github.com/Shopify/sarama"
)

// PLAINTEXT
config := sarama.NewConfig()
brokers := []string{"kafka-1:9092", "kafka-2:9092"}

// SSL
config := sarama.NewConfig()
config.Net.TLS.Enable = true

caCert, _ := ioutil.ReadFile("/path/to/ca-cert.pem")
caCertPool := x509.NewCertPool()
caCertPool.AppendCertsFromPEM(caCert)

tlsConfig := &tls.Config{
    RootCAs:            caCertPool,
    InsecureSkipVerify: true,
}
config.Net.TLS.Config = tlsConfig

brokers := []string{"kafka-1:9094", "kafka-2:9094"}
```

## Network Requirements

**Same Docker/Podman Network:**
- Use hostnames: `kafka-1`, `kafka-2`
- Containers must be on the same network (e.g., `kafka-network-tls`)

**From Host Machine:**
- Use `localhost` with mapped ports
- PLAINTEXT: 9092 (kafka-1), 9095 (kafka-2)
- SSL: 9094 (kafka-1), 9097 (kafka-2)

**From External Network:**
- Update `KAFKA_ADVERTISED_LISTENERS` with public IP/hostname
- Ensure firewall allows ports 9092-9097

## Required Files for SSL

Only the CA certificate is needed for clients:

```
ca-cert.pem  - Certificate Authority certificate
```

This file is located in the `certs/` directory.

## Troubleshooting

### Cannot resolve hostname

If you get "DNS resolution failed for kafka-1":
- Ensure containers are on the same network
- Use IP addresses instead of hostnames
- Or use `localhost` with port mapping from host

### SSL handshake failed

If you get "SSL handshake failed":
- Verify `ssl.truststore.location` path is correct
- Ensure `ssl.truststore.type=PEM`
- Add `ssl.endpoint.identification.algorithm=` to disable hostname verification

### Connection timeout

- Check if brokers are running: `podman ps | grep kafka`
- Verify ports are exposed: `podman port kafka-1-tls`
- Check broker logs: `podman logs kafka-1-tls`

## Summary

**Minimum Configuration for SSL:**
```properties
security.protocol=SSL
ssl.truststore.location=/path/to/ca-cert.pem
ssl.truststore.type=PEM
ssl.endpoint.identification.algorithm=
```

**Network:**
- Same network as brokers: Use `kafka-1:9094` and `kafka-2:9094`
- From host: Use `localhost:9094` and `localhost:9097`
