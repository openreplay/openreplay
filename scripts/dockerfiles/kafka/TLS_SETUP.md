# Kafka TLS Setup - Super Simple

## TL;DR - 2 Steps to TLS

```bash
# 1. Generate certificates
./generate-certs.sh

# 2. Start TLS cluster
podman-compose -f docker-compose-tls.yml up -d
```

**That's it!** Your cluster now has TLS encryption.

---

## What You Get

- **Automatic PEM to JKS conversion** - No manual keystore creation
- **Both PLAINTEXT and SSL listeners** - Gradual migration support  
- **2-node cluster with replication** - Production-ready setup
- **Self-signed certificates** - Perfect for development/testing

---

## Configuration is Simple

Just provide 3 PEM files per broker:

```yaml
environment:
  KAFKA_SSL_CERT_FILE: /path/to/cert.pem    # Server certificate
  KAFKA_SSL_KEY_FILE: /path/to/key.pem      # Private key
  KAFKA_SSL_CA_FILE: /path/to/ca-cert.pem   # CA certificate (optional)
```

The container **automatically converts** PEM to JKS format at startup!

---

## Ports

### Kafka-1
- **9092** - PLAINTEXT (unencrypted)
- **9093** - CONTROLLER (internal)
- **9094** - SSL (encrypted)

### Kafka-2
- **9095** - PLAINTEXT (unencrypted)
- **9096** - CONTROLLER (internal)
- **9097** - SSL (encrypted)

---

## Testing TLS

### Create a client config

```bash
cat > client-ssl.properties << EOF
security.protocol=SSL
ssl.truststore.location=/bitnami/kafka/certs/ca-cert.pem
ssl.truststore.type=PEM
EOF
```

### Test with SSL

```bash
# Create topic on SSL port
podman exec kafka-1-tls /usr/lib/kafka/bin/kafka-topics.sh \
  --create --topic secure-topic \
  --bootstrap-server kafka-1:9094 \
  --command-config client-ssl.properties

# Produce to SSL port
echo "Hello TLS!" | podman exec -i kafka-1-tls \
  /usr/lib/kafka/bin/kafka-console-producer.sh \
  --topic secure-topic \
  --bootstrap-server kafka-1:9094 \
  --producer.config client-ssl.properties

# Consume from SSL port
podman exec kafka-1-tls /usr/lib/kafka/bin/kafka-console-consumer.sh \
  --topic secure-topic \
  --from-beginning \
  --bootstrap-server kafka-1:9094 \
  --consumer.config client-ssl.properties \
  --max-messages 1
```

---

## Using Your Own Certificates

Replace generated certificates with your own:

```bash
# 1. Copy your certificates
cp your-kafka-1-cert.pem certs/kafka-1-cert.pem
cp your-kafka-1-key.pem certs/kafka-1-key.pem
cp your-ca-cert.pem certs/ca-cert.pem

# 2. Do the same for kafka-2

# 3. Start cluster
podman-compose -f docker-compose-tls.yml up -d
```

**No keystore conversion needed!** The container does it automatically.

---

## Production Checklist

When deploying to production:

### 1. Use CA-signed certificates
Replace self-signed certs with certificates from your CA (Let's Encrypt, DigiCert, etc.)

### 2. Enable hostname verification
Remove this line from docker-compose-tls.yml:
```yaml
KAFKA_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM: ""
```

### 3. Use SSL for inter-broker
Change:
```yaml
KAFKA_INTER_BROKER_LISTENER_NAME: SSL
```

### 4. Disable PLAINTEXT (optional)
Remove PLAINTEXT from listeners if you want SSL-only:
```yaml
KAFKA_LISTENERS: CONTROLLER://:9093,SSL://:9094
KAFKA_ADVERTISED_LISTENERS: SSL://kafka-1:9094
```

### 5. Secure certificate files
Ensure cert files have proper permissions:
```bash
chmod 600 certs/*-key.pem
chmod 644 certs/*-cert.pem
```

### 6. Use secrets management
For production, use:
- Kubernetes Secrets
- HashiCorp Vault
- AWS Secrets Manager
- Docker Secrets

---

## Environment Variables Reference

### Required for TLS

| Variable | Description | Example |
|----------|-------------|---------|
| `KAFKA_SSL_CERT_FILE` | Path to PEM certificate | `/path/to/cert.pem` |
| `KAFKA_SSL_KEY_FILE` | Path to PEM private key | `/path/to/key.pem` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `KAFKA_SSL_CA_FILE` | Path to CA certificate | - |
| `KAFKA_SSL_CLIENT_AUTH` | Client auth mode | `required` |
| `KAFKA_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM` | Hostname verification | `https` |

---

## How It Works

When you provide PEM files, the startup script:

1. **Detects** PEM certificate files
2. **Converts** PEM → PKCS12 → JKS automatically
3. **Configures** Kafka with generated keystores
4. **Cleans up** temporary files
5. **Starts** Kafka with TLS enabled

**Zero manual keystore management!**

---

## Troubleshooting

### "Connection refused" on SSL port

```bash
# Check if SSL listener is running
podman exec kafka-1-tls netstat -tlnp | grep 9094

# Check logs for SSL errors
podman logs kafka-1-tls | grep -i ssl
```

### Certificate hostname mismatch

Add your broker hostname to certificate SAN:
```bash
# When generating, add:
-addext "subjectAltName=DNS:your-broker-hostname,DNS:localhost"
```

Or disable verification for testing:
```yaml
KAFKA_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM: ""
```

### "Keystore was tampered with"

Password mismatch - check that cert and key belong together:
```bash
# Verify cert and key match
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in key.pem | openssl md5
# These should match!
```

---

## Advanced: SASL + SSL

For even stronger security, combine SSL with SASL authentication:

```yaml
environment:
  KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: SASL_SSL:SASL_SSL,CONTROLLER:PLAINTEXT
  KAFKA_SASL_MECHANISM_INTER_BROKER_PROTOCOL: PLAIN
  KAFKA_SASL_ENABLED_MECHANISMS: SCRAM-SHA-512
  # ... SSL config as above
```

---

**Questions?** Check the logs: `podman logs kafka-1-tls`
