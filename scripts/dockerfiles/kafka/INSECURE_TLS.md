# TLS Without Certificate Verification

## Summary

**Java/Kafka CLI Tools**: Requires CA certificate (Java enforces validation)
**Python/Node.js/Go/Others**: Support insecure mode (no CA needed)

## Language-Specific Examples

### Python (kafka-python)

**With insecure TLS (no CA verification):**

```python
from kafka import KafkaProducer, KafkaConsumer
import ssl

# Create SSL context that doesn't verify
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

producer = KafkaProducer(
    bootstrap_servers=['kafka-1:9094', 'kafka-2:9094'],
    security_protocol='SSL',
    ssl_context=ssl_context
)

consumer = KafkaConsumer(
    'my-topic',
    bootstrap_servers=['kafka-1:9094', 'kafka-2:9094'],
    security_protocol='SSL',
    ssl_context=ssl_context
)
```

**Or using parameters directly:**

```python
producer = KafkaProducer(
    bootstrap_servers=['kafka-1:9094', 'kafka-2:9094'],
    security_protocol='SSL',
    ssl_check_hostname=False,
    ssl_cert_reqs=ssl.CERT_NONE
)
```

### Node.js (kafkajs)

**With insecure TLS:**

```javascript
const { Kafka } = require('kafkajs')

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['kafka-1:9094', 'kafka-2:9094'],
  ssl: {
    rejectUnauthorized: false  // Accept self-signed certificates
  }
})
```

### Go (sarama)

**With insecure TLS:**

```go
import (
    "crypto/tls"
    "github.com/Shopify/sarama"
)

config := sarama.NewConfig()
config.Net.TLS.Enable = true
config.Net.TLS.Config = &tls.Config{
    InsecureSkipVerify: true,  // Skip certificate verification
}

brokers := []string{"kafka-1:9094", "kafka-2:9094"}
producer, _ := sarama.NewSyncProducer(brokers, config)
```

### .NET (Confluent.Kafka)

**With insecure TLS:**

```csharp
var config = new ProducerConfig
{
    BootstrapServers = "kafka-1:9094,kafka-2:9094",
    SecurityProtocol = SecurityProtocol.Ssl,
    SslEndpointIdentificationAlgorithm = SslEndpointIdentificationAlgorithm.None,
    EnableSslCertificateVerification = false  // Skip verification
};
```

### Rust (rdkafka)

**With insecure TLS:**

```rust
use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};

let producer: FutureProducer = ClientConfig::new()
    .set("bootstrap.servers", "kafka-1:9094,kafka-2:9094")
    .set("security.protocol", "SSL")
    .set("enable.ssl.certificate.verification", "false")
    .create()
    .expect("Producer creation failed");
```

### Ruby (ruby-kafka)

**With insecure TLS:**

```ruby
require 'kafka'

kafka = Kafka.new(
  ['kafka-1:9094', 'kafka-2:9094'],
  ssl_verify_hostname: false,
  ssl_ca_cert: nil  # No CA certificate needed
)
```

### PHP (php-rdkafka)

**With insecure TLS:**

```php
$conf = new RdKafka\Conf();
$conf->set('bootstrap.servers', 'kafka-1:9094,kafka-2:9094');
$conf->set('security.protocol', 'SSL');
$conf->set('enable.ssl.certificate.verification', 'false');

$producer = new RdKafka\Producer($conf);
```

## Java/Kafka CLI Tools

For Java-based tools (kafka-topics.sh, kafka-console-producer.sh, etc.), you **must** provide the CA certificate:

```properties
security.protocol=SSL
ssl.truststore.location=/path/to/ca-cert.pem
ssl.truststore.type=PEM
ssl.endpoint.identification.algorithm=
```

**Why?** Java's SSL implementation enforces certificate validation and doesn't have a simple "insecure" flag.

**Workaround:** Just use the ca-cert.pem file (it's small and easy to distribute)

## Comparison Table

| Language/Tool | Insecure Mode | Config Parameter |
|---------------|---------------|------------------|
| Python | Yes | `ssl_check_hostname=False, ssl_cert_reqs=ssl.CERT_NONE` |
| Node.js | Yes | `ssl: { rejectUnauthorized: false }` |
| Go | Yes | `InsecureSkipVerify: true` |
| .NET | Yes | `EnableSslCertificateVerification = false` |
| Rust | Yes | `enable.ssl.certificate.verification=false` |
| Ruby | Yes | `ssl_verify_hostname: false` |
| PHP | Yes | `enable.ssl.certificate.verification=false` |
| Java/CLI | No | Requires CA certificate |

## Security Note

Disabling certificate verification provides **encryption only**, not authentication. This means:
- Traffic is encrypted (prevents eavesdropping)
- No protection against man-in-the-middle attacks
- Cannot verify you're connecting to the correct server

**Use in production:** Not recommended
**Use in development/testing:** Acceptable
**Use in private networks:** Acceptable with additional network security

## Recommendation

**Best approach:**
1. For most languages: Use insecure mode for simplicity
2. For Java/CLI tools: Provide the ca-cert.pem file
3. For production: Always use proper certificate verification

**Distributing the CA certificate is easy:**
- It's a single small text file
- Can be embedded in config management
- No passwords or sensitive data
- Same file works for all clients
