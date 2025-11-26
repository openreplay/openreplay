# Kafka Helm Chart

Apache Kafka StatefulSet with KRaft mode support for Kubernetes.

## Features

- KRaft mode (no Zookeeper required)
- StatefulSet-based deployment
- Optional TLS/SSL support
- Configurable persistence
- Pod anti-affinity for high availability
- Customizable resource limits
- Support for multiple listeners (PLAINTEXT and SSL)

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- PV provisioner support in the underlying infrastructure (if persistence is enabled)

## Installing the Chart

```bash
# Install with default values (no TLS)
helm install kafka .

# Install with custom values
helm install kafka . -f values.yaml

# Install with TLS enabled
helm install kafka . -f values-tls.yaml
```

## Configuration

See `values.yaml` for all configuration options.

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of Kafka brokers | `2` |
| `image.repository` | Kafka image repository | `rjshrjndrn/kafka` |
| `image.tag` | Kafka image tag | `3` |
| `kraft.enabled` | Enable KRaft mode | `true` |
| `kraft.clusterId` | KRaft cluster ID | `Sjg_Rr1iQbO9xpahgDbYpQ` |
| `tls.enabled` | Enable TLS/SSL | `false` |
| `tls.secretName` | Secret containing TLS certificates | `kafka-tls-certs` |
| `persistence.enabled` | Enable persistence | `true` |
| `persistence.size` | Size of persistent volume | `100Gi` |
| `resources.requests.cpu` | CPU request | `500m` |
| `resources.requests.memory` | Memory request | `1Gi` |
| `resources.limits.cpu` | CPU limit | `2000m` |
| `resources.limits.memory` | Memory limit | `2Gi` |

## TLS Configuration

To enable TLS, you need to create a secret with the following structure:

```bash
kubectl create secret generic kafka-tls-certs \
  --from-file=ca-cert.pem=./certs/ca-cert.pem \
  --from-file=kafka-0-cert.pem=./certs/kafka-0-cert.pem \
  --from-file=kafka-0-key.pem=./certs/kafka-0-key.pem \
  --from-file=kafka-1-cert.pem=./certs/kafka-1-cert.pem \
  --from-file=kafka-1-key.pem=./certs/kafka-1-key.pem \
  -n db
```

Then enable TLS in values:

```yaml
tls:
  enabled: true
  secretName: kafka-tls-certs

listeners:
  ssl:
    enabled: true
    port: 9094
```

## Accessing Kafka

### From within the cluster

```bash
# PLAINTEXT endpoint
kafka.db.svc.cluster.local:9092

# Headless service (for direct pod access)
kafka-headless.db.svc.cluster.local:9092

# SSL endpoint (if enabled)
kafka-ssl.db.svc.cluster.local:9094
```

## Uninstalling the Chart

```bash
helm uninstall kafka
```

This will remove all resources but **not** the PVCs. To delete PVCs:

```bash
kubectl delete pvc -l app.kubernetes.io/name=kafka
```
