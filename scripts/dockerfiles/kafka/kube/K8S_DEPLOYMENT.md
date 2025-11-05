# Kubernetes Deployment Guide - KRaft Kafka

This guide covers deploying a 2-node Kafka cluster with KRaft (no ZooKeeper) on Kubernetes, with and without TLS.

## Overview

- **Mode**: KRaft (no ZooKeeper required)
- **Replicas**: 2 nodes
- **Namespace**: `db`
- **Service Names**: `kafka`, `kafka-headless` (matches existing helm chart)
- **PVC Names**: `data-kafka-{0,1}` (matches existing helm chart)

## Prerequisites

1. Kubernetes cluster (1.19+)
2. kubectl configured
3. Storage class available
4. Build and push the Kafka image:

```bash
# Build image
make build

# Tag for your registry
docker tag local/kafka:3 your-registry/kafka:3

# Push to registry
docker push your-registry/kafka:3

# Update image in manifests
sed -i 's|local/kafka:3|your-registry/kafka:3|g' k8s-kafka-kraft*.yaml
```

## Deployment Options

### Option 1: PLAINTEXT Only (No TLS)

**Use case**: Development, testing, or internal-only clusters

**Manifest**: `k8s-kafka-kraft.yaml`

**Ports**:
- 9092: CLIENT (PLAINTEXT)
- 9093: INTERNAL + CONTROLLER (PLAINTEXT)

### Option 2: PLAINTEXT + TLS

**Use case**: Production with gradual TLS migration

**Manifest**: `k8s-kafka-kraft-tls.yaml`

**Ports**:
- 9092: CLIENT (PLAINTEXT)
- 9093: INTERNAL + CONTROLLER (PLAINTEXT)
- 9094: SSL (encrypted)

## Quick Start

### Deploy PLAINTEXT Cluster

```bash
# 1. Create namespace
kubectl create namespace db

# 2. Apply manifest
kubectl apply -f k8s-kafka-kraft.yaml

# 3. Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kafka -n db --timeout=300s

# 4. Check status
kubectl get pods -n db -l app.kubernetes.io/name=kafka
kubectl get svc -n db
```

### Deploy TLS-Enabled Cluster

```bash
# 1. Create namespace
kubectl create namespace db

# 2. Generate certificates and create secret
./k8s-generate-certs.sh

# Or manually:
# kubectl create secret generic kafka-tls-certs \
#   --from-file=ca-cert.pem=./k8s-certs/ca-cert.pem \
#   --from-file=kafka-0-cert.pem=./k8s-certs/kafka-0-cert.pem \
#   --from-file=kafka-0-key.pem=./k8s-certs/kafka-0-key.pem \
#   --from-file=kafka-1-cert.pem=./k8s-certs/kafka-1-cert.pem \
#   --from-file=kafka-1-key.pem=./k8s-certs/kafka-1-key.pem \
#   -n db

# 3. Apply TLS manifest
kubectl apply -f k8s-kafka-kraft-tls.yaml

# 4. Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kafka -n db --timeout=300s

# 5. Check status
kubectl get pods -n db -l app.kubernetes.io/name=kafka
kubectl get svc -n db
```

## Service Endpoints

### PLAINTEXT Deployment

**Within cluster:**
- Bootstrap servers: `kafka.db.svc.cluster.local:9092`
- Individual brokers:
  - `kafka-0.kafka-headless.db.svc.cluster.local:9092`
  - `kafka-1.kafka-headless.db.svc.cluster.local:9092`

### TLS Deployment

**PLAINTEXT (for migration):**
- Bootstrap: `kafka.db.svc.cluster.local:9092`

**SSL (encrypted):**
- Bootstrap: `kafka-ssl.db.svc.cluster.local:9094`
- Individual brokers:
  - `kafka-0.kafka-headless.db.svc.cluster.local:9094`
  - `kafka-1.kafka-headless.db.svc.cluster.local:9094`

## Testing the Deployment

### Test PLAINTEXT Connection

```bash
# Create a test pod
kubectl run kafka-test -n db --rm -it --restart=Never \
  --image=your-registry/kafka:3 \
  -- /bin/bash

# Inside the pod:

# List topics
/usr/lib/kafka/bin/kafka-topics.sh \
  --list \
  --bootstrap-server kafka.db.svc.cluster.local:9092

# Create topic
/usr/lib/kafka/bin/kafka-topics.sh \
  --create \
  --topic test-topic \
  --bootstrap-server kafka.db.svc.cluster.local:9092 \
  --replication-factor 1 \
  --partitions 3

# Produce messages
echo "Hello Kafka" | /usr/lib/kafka/bin/kafka-console-producer.sh \
  --topic test-topic \
  --bootstrap-server kafka.db.svc.cluster.local:9092

# Consume messages
/usr/lib/kafka/bin/kafka-console-consumer.sh \
  --topic test-topic \
  --from-beginning \
  --bootstrap-server kafka.db.svc.cluster.local:9092 \
  --max-messages 1
```

### Test TLS Connection

```bash
# Create test pod with TLS certs
kubectl run kafka-test-tls -n db --rm -it --restart=Never \
  --image=your-registry/kafka:3 \
  --overrides='
{
  "spec": {
    "containers": [{
      "name": "kafka-test-tls",
      "image": "your-registry/kafka:3",
      "command": ["/bin/bash"],
      "stdin": true,
      "tty": true,
      "volumeMounts": [{
        "name": "tls",
        "mountPath": "/tls"
      }]
    }],
    "volumes": [{
      "name": "tls",
      "secret": {
        "secretName": "kafka-tls-certs"
      }
    }]
  }
}' \
  -- /bin/bash

# Inside the pod, create SSL client config:
cat > /tmp/ssl-client.properties << EOF
security.protocol=SSL
ssl.truststore.location=/tls/ca-cert.pem
ssl.truststore.type=PEM
ssl.endpoint.identification.algorithm=
EOF

# List topics via SSL
/usr/lib/kafka/bin/kafka-topics.sh \
  --list \
  --bootstrap-server kafka-ssl.db.svc.cluster.local:9094 \
  --command-config /tmp/ssl-client.properties

# Create topic via SSL
/usr/lib/kafka/bin/kafka-topics.sh \
  --create \
  --topic secure-topic \
  --bootstrap-server kafka-ssl.db.svc.cluster.local:9094 \
  --command-config /tmp/ssl-client.properties \
  --replication-factor 1 \
  --partitions 3

# Produce via SSL
echo "Hello Secure Kafka" | /usr/lib/kafka/bin/kafka-console-producer.sh \
  --topic secure-topic \
  --bootstrap-server kafka-ssl.db.svc.cluster.local:9094 \
  --producer.config /tmp/ssl-client.properties

# Consume via SSL
/usr/lib/kafka/bin/kafka-console-consumer.sh \
  --topic secure-topic \
  --from-beginning \
  --bootstrap-server kafka-ssl.db.svc.cluster.local:9094 \
  --consumer.config /tmp/ssl-client.properties \
  --max-messages 1
```

## Verification

### Check Pod Status

```bash
# Get pods
kubectl get pods -n db -l app.kubernetes.io/name=kafka

# Check logs
kubectl logs -n db kafka-0 --tail=50
kubectl logs -n db kafka-1 --tail=50

# Check node IDs are correct
kubectl logs -n db kafka-0 | grep "node.id"
kubectl logs -n db kafka-1 | grep "node.id"
```

### Check Services

```bash
# List services
kubectl get svc -n db

# Describe services
kubectl describe svc kafka -n db
kubectl describe svc kafka-headless -n db
kubectl describe svc kafka-ssl -n db  # TLS only
```

### Check PVCs

```bash
# List PVCs
kubectl get pvc -n db

# Should show:
# data-kafka-0   Bound
# data-kafka-1   Bound
```

### Check Cluster Metadata

```bash
# Exec into pod
kubectl exec -it kafka-0 -n db -- /bin/bash

# Check broker list
/usr/lib/kafka/bin/kafka-broker-api-versions.sh \
  --bootstrap-server localhost:9092

# Check cluster ID
cat /bitnami/kafka/data/meta.properties | grep cluster.id
```

## Configuration Customization

### Change Message Size

Edit the manifest and adjust these env vars:

```yaml
- name: KAFKA_MESSAGE_MAX_BYTES
  value: "10485760"  # 10MB
- name: KAFKA_REPLICA_FETCH_MAX_BYTES
  value: "10485760"
```

### Change Retention

```yaml
- name: KAFKA_LOG_RETENTION_HOURS
  value: "720"  # 30 days
- name: KAFKA_LOG_RETENTION_BYTES
  value: "10737418240"  # 10GB
```

### Change Replication Factor

For production with 2 nodes, consider replication:

```yaml
- name: KAFKA_CFG_DEFAULT_REPLICATION_FACTOR
  value: "2"
- name: KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR
  value: "2"
- name: KAFKA_CFG_TRANSACTION_STATE_LOG_REPLICATION_FACTOR
  value: "2"
- name: KAFKA_CFG_MIN_INSYNC_REPLICAS
  value: "2"
```

### Change Storage Size

Edit volumeClaimTemplates:

```yaml
volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes:
        - "ReadWriteOnce"
      resources:
        requests:
          storage: "200Gi"  # Change size
```

### Change Resource Limits

```yaml
resources:
  requests:
    cpu: 1000m
    memory: 2Gi
  limits:
    cpu: 4000m
    memory: 8Gi
```

## Scaling

### Scale Up (Not Recommended for StatefulSet)

KRaft requires careful scaling. If you need more brokers:

```bash
# Edit replicas
kubectl scale statefulset kafka -n db --replicas=3

# Add new node to KAFKA_CONTROLLER_QUORUM_VOTERS
# This requires updating the manifest and restarting all pods
```

**Note**: Scaling KRaft clusters requires updating `KAFKA_CONTROLLER_QUORUM_VOTERS` on all nodes. It's better to deploy with the desired size initially.

### Scale Down

**Warning**: Scaling down can cause data loss!

```bash
# First, reassign partitions from the broker being removed
# Then scale down
kubectl scale statefulset kafka -n db --replicas=1
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod events
kubectl describe pod kafka-0 -n db

# Check logs
kubectl logs kafka-0 -n db

# Common issues:
# - PVC not binding: Check storage class
# - Image pull errors: Check image name and registry access
# - Config errors: Check environment variables
```

### Node ID Issues

The node ID is derived from the pod ordinal. Verify:

```bash
kubectl exec kafka-0 -n db -- env | grep KAFKA_NODE_ID
kubectl exec kafka-1 -n db -- env | grep KAFKA_NODE_ID

# Should show:
# kafka-0: KAFKA_NODE_ID=kafka-0 (converted to 1 by start-kafka.sh)
# kafka-1: KAFKA_NODE_ID=kafka-1 (converted to 2 by start-kafka.sh)
```

If node IDs are wrong, the start-kafka.sh script needs adjustment.

### TLS Certificate Issues

```bash
# Check secret exists
kubectl get secret kafka-tls-certs -n db

# Check secret contents
kubectl describe secret kafka-tls-certs -n db

# Check cert files in pod
kubectl exec kafka-0 -n db -- ls -la /tls/

# Verify certificate
kubectl exec kafka-0 -n db -- openssl x509 -in /tls/server-cert.pem -text -noout
```

### Connection Issues

```bash
# Test from within cluster
kubectl run test -n db --rm -it --restart=Never \
  --image=busybox -- nc -zv kafka.db.svc.cluster.local 9092

# Check service endpoints
kubectl get endpoints kafka -n db
kubectl get endpoints kafka-headless -n db

# Check if ports are open
kubectl exec kafka-0 -n db -- netstat -tlnp
```

### Quorum Issues

```bash
# Check controller quorum
kubectl exec kafka-0 -n db -- cat /bitnami/kafka/data/meta.properties

# Check cluster metadata
kubectl exec kafka-0 -n db -- /usr/lib/kafka/bin/kafka-metadata.sh \
  --snapshot /bitnami/kafka/data/__cluster_metadata-0/00000000000000000000.log \
  --print
```

## Upgrading

### Image Upgrade

```bash
# Update image in manifest
sed -i 's|local/kafka:3|local/kafka:4|g' k8s-kafka-kraft.yaml

# Apply update (rolling restart)
kubectl apply -f k8s-kafka-kraft.yaml

# Monitor rollout
kubectl rollout status statefulset/kafka -n db
```

### Configuration Changes

```bash
# Edit manifest with new config
vim k8s-kafka-kraft.yaml

# Apply changes
kubectl apply -f k8s-kafka-kraft.yaml

# Restart pods to pick up changes
kubectl rollout restart statefulset/kafka -n db
```

## Cleanup

### Delete Cluster (Keep Data)

```bash
kubectl delete statefulset kafka -n db
kubectl delete svc kafka kafka-headless kafka-ssl -n db
kubectl delete sa kafka -n db
kubectl delete secret kafka-tls-certs -n db

# PVCs are preserved
```

### Delete Cluster (Remove Data)

```bash
kubectl delete statefulset kafka -n db
kubectl delete svc kafka kafka-headless kafka-ssl -n db
kubectl delete pvc data-kafka-0 data-kafka-1 -n db
kubectl delete sa kafka -n db
kubectl delete secret kafka-tls-certs -n db
```

### Delete Namespace (Everything)

```bash
kubectl delete namespace db
```

## Migration from ZooKeeper to KRaft

If migrating from the existing ZooKeeper-based deployment:

1. **Backup data**: Export topics and consumer offsets
2. **Deploy new KRaft cluster**: Use these manifests
3. **MirrorMaker**: Set up MirrorMaker 2 to replicate data
4. **Cutover**: Update client configs to point to new cluster
5. **Decommission**: Remove old ZooKeeper-based cluster

**Note**: Direct migration from ZooKeeper to KRaft on the same cluster is not supported in Kafka 3.x.

## Production Checklist

- [ ] Use proper TLS certificates (not self-signed)
- [ ] Enable hostname verification in production
- [ ] Set appropriate resource limits
- [ ] Configure appropriate retention policies
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation (EFK/Loki)
- [ ] Set replication factor ≥ 2
- [ ] Use persistent storage with backups
- [ ] Configure pod disruption budgets
- [ ] Set up network policies
- [ ] Use dedicated node pools for Kafka
- [ ] Configure affinity/anti-affinity rules

## References

- [Kafka KRaft Documentation](https://kafka.apache.org/documentation/#kraft)
- [Kafka on Kubernetes Best Practices](https://strimzi.io/docs/operators/latest/overview.html)
- [StatefulSet Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
