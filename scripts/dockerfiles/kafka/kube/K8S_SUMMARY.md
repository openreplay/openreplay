# Kubernetes KRaft Kafka - Summary

## What's New

Two KRaft-based Kafka StatefulSet manifests for Kubernetes deployment:

1. **k8s-kafka-kraft.yaml** - PLAINTEXT only
2. **k8s-kafka-kraft-tls.yaml** - PLAINTEXT + TLS

## Key Features

- **No ZooKeeper Required** - Uses Kafka KRaft mode
- **Same Service/PVC Names** - Drop-in replacement for existing helm chart
- **2-Node Cluster** - Matches current deployment
- **Same Configuration** - All existing KAFKA_CFG_* env vars supported
- **Automatic Node ID** - Derived from pod name (kafka-0 → 1, kafka-1 → 2)

## Comparison: Old vs New

| Aspect | Old (Helm + ZooKeeper) | New (KRaft) |
|--------|------------------------|-------------|
| Components | Kafka + ZooKeeper StatefulSets | Kafka StatefulSet only |
| Total Pods | 3 (2 kafka + 1 zookeeper) | 2 (kafka only) |
| Service Names | `kafka`, `kafka-headless` | ✅ Same |
| PVC Names | `data-kafka-{0,1}` | ✅ Same |
| Port Names | `kafka-client`, `kafka-internal` | ✅ Same |
| Namespace | `db` | ✅ Same |
| Labels | `app.kubernetes.io/name=kafka` | ✅ Same |
| Config Method | Bitnami env vars | ✅ Same + custom script |
| Mode | ZooKeeper | KRaft |
| Complexity | Higher | Lower |
| Startup Time | Slower (ZK dependency) | Faster |

## Files Provided

### Manifests
- **k8s-kafka-kraft.yaml** - PLAINTEXT deployment (development/testing)
- **k8s-kafka-kraft-tls.yaml** - TLS-enabled deployment (production)

### Scripts
- **k8s-generate-certs.sh** - Generate TLS certificates for Kubernetes

### Documentation
- **K8S_QUICK_START.md** - Quick start guide (5 minutes)
- **K8S_DEPLOYMENT.md** - Complete deployment guide with troubleshooting
- **K8S_SUMMARY.md** - This file

## Quick Deployment

### PLAINTEXT (3 commands)

```bash
kubectl create namespace db
kubectl apply -f k8s-kafka-kraft.yaml
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kafka -n db --timeout=300s
```

### TLS (4 commands)

```bash
kubectl create namespace db
./k8s-generate-certs.sh
kubectl apply -f k8s-kafka-kraft-tls.yaml
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kafka -n db --timeout=300s
```

## Connection Details

### PLAINTEXT Deployment

**Service**: `kafka.db.svc.cluster.local:9092`

**Direct Broker Access**:
- `kafka-0.kafka-headless.db.svc.cluster.local:9092`
- `kafka-1.kafka-headless.db.svc.cluster.local:9092`

### TLS Deployment

**PLAINTEXT**: `kafka.db.svc.cluster.local:9092`

**SSL**: `kafka-ssl.db.svc.cluster.local:9094`

**Direct SSL Broker Access**:
- `kafka-0.kafka-headless.db.svc.cluster.local:9094`
- `kafka-1.kafka-headless.db.svc.cluster.local:9094`

## Configuration

### Inherited from Helm Chart

All configuration from the original helm chart is preserved:

```yaml
- KAFKA_CFG_MESSAGE_MAX_BYTES: "3145728"
- KAFKA_CFG_LOG_RETENTION_HOURS: "168"
- KAFKA_CFG_LOG_RETENTION_BYTES: "1073741824"
- KAFKA_CFG_LOG_SEGMENT_BYTES: "1073741824"
- KAFKA_CFG_NUM_IO_THREADS: "8"
- KAFKA_CFG_NUM_NETWORK_THREADS: "3"
- KAFKA_CFG_DEFAULT_REPLICATION_FACTOR: "1"
- KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR: "1"
# ... and all others
```

### New KRaft-Specific Variables

```yaml
- KAFKA_CLUSTER_ID: "Sjg_Rr1iQbO9xpahgDbYpQ"
- KAFKA_PROCESS_ROLES: "broker,controller"
- KAFKA_CONTROLLER_QUORUM_VOTERS: "1@kafka-0...:9093,2@kafka-1...:9093"
- KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
```

### Easy Customization

Just edit the YAML and change any env var value:

```yaml
# Increase message size to 10MB
- name: KAFKA_MESSAGE_MAX_BYTES
  value: "10485760"

# Change retention to 30 days
- name: KAFKA_LOG_RETENTION_HOURS
  value: "720"

# Any Kafka property using KAFKA_CFG_ prefix
- name: KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE
  value: "false"
```

## Advantages of KRaft

### Operational
- ✅ No ZooKeeper to manage
- ✅ Simpler deployment (fewer components)
- ✅ Faster startup time
- ✅ Better scaling capabilities
- ✅ Reduced operational complexity

### Performance
- ✅ Lower latency for metadata operations
- ✅ Better throughput for partition changes
- ✅ More efficient leader elections

### Resource Usage
- ✅ Fewer pods (2 vs 3)
- ✅ Lower memory footprint
- ✅ Reduced network traffic

## Migration Path

### Option 1: Clean Deployment (Recommended)

1. Deploy new KRaft cluster
2. Use MirrorMaker 2 to replicate data
3. Cutover clients to new cluster
4. Decommission old cluster

### Option 2: Side-by-Side

1. Deploy KRaft cluster with different service names
2. Gradually migrate topics/consumers
3. Decommission old cluster when done

### Option 3: Blue/Green

1. Deploy KRaft cluster in new namespace
2. Test thoroughly
3. Switch traffic
4. Remove old cluster

**Note**: Direct in-place migration from ZooKeeper to KRaft is not supported in Kafka 3.x.

## Testing

### Quick Test

```bash
# Create topic
kubectl run kafka-test -n db --rm -it --restart=Never \
  --image=your-registry/kafka:3 -- \
  /usr/lib/kafka/bin/kafka-topics.sh \
    --create --topic test \
    --bootstrap-server kafka.db.svc.cluster.local:9092

# List topics
kubectl run kafka-test -n db --rm -it --restart=Never \
  --image=your-registry/kafka:3 -- \
  /usr/lib/kafka/bin/kafka-topics.sh \
    --list \
    --bootstrap-server kafka.db.svc.cluster.local:9092
```

### Verify Cluster

```bash
# Check pods
kubectl get pods -n db -l app.kubernetes.io/name=kafka

# Check services
kubectl get svc -n db

# Check PVCs
kubectl get pvc -n db

# Check logs
kubectl logs -n db kafka-0 --tail=50
kubectl logs -n db kafka-1 --tail=50
```

## Resource Requirements

### Default (Matches Helm Chart)

```yaml
requests:
  cpu: 500m
  memory: 1Gi
limits:
  cpu: 2000m
  memory: 2Gi
```

### Recommended for Production

```yaml
requests:
  cpu: 1000m
  memory: 2Gi
limits:
  cpu: 4000m
  memory: 8Gi
```

## Storage

- **Default**: 100Gi per broker (matches helm chart)
- **Recommended**: 200Gi+ for production
- **Access Mode**: ReadWriteOnce
- **Storage Class**: Default (configure as needed)

## TLS Certificate Details

### Generated Files

```
k8s-certs/
├── ca-cert.pem          # Certificate Authority
├── ca-key.pem           # CA private key
├── kafka-0-cert.pem     # Broker 0 certificate
├── kafka-0-key.pem      # Broker 0 private key
├── kafka-1-cert.pem     # Broker 1 certificate
├── kafka-1-key.pem      # Broker 1 private key
└── kafka-tls-secret.yaml # Kubernetes secret manifest
```

### Certificate SANs

Each certificate includes:
- Pod name: `kafka-{0,1}`
- Headless service: `kafka-{0,1}.kafka-headless.db.svc.cluster.local`
- All intermediate DNS names
- localhost

### Secret Structure

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: kafka-tls-certs
  namespace: db
type: Opaque
data:
  ca-cert.pem: <base64>
  kafka-0-cert.pem: <base64>
  kafka-0-key.pem: <base64>
  kafka-1-cert.pem: <base64>
  kafka-1-key.pem: <base64>
```

## Troubleshooting Quick Reference

### Pods Not Ready

```bash
kubectl describe pod kafka-0 -n db
kubectl logs kafka-0 -n db
```

### Node ID Issues

```bash
# Should show node IDs 1 and 2
kubectl logs kafka-0 -n db | grep "node.id"
kubectl logs kafka-1 -n db | grep "node.id"
```

### Connection Issues

```bash
# Test connectivity
kubectl run test -n db --rm -it --restart=Never \
  --image=busybox -- nc -zv kafka.db.svc.cluster.local 9092

# Check service endpoints
kubectl get endpoints kafka -n db
```

### PVC Issues

```bash
kubectl get pvc -n db
kubectl describe pvc data-kafka-0 -n db
```

### TLS Certificate Issues

```bash
# Check secret
kubectl get secret kafka-tls-certs -n db

# Check cert in pod
kubectl exec kafka-0 -n db -- ls -la /tls/
kubectl exec kafka-0 -n db -- openssl x509 -in /tls/server-cert.pem -text -noout
```

## Production Checklist

Before deploying to production:

- [ ] Use proper CA-signed certificates (not self-signed)
- [ ] Configure resource requests/limits based on load
- [ ] Set appropriate retention policies
- [ ] Configure replication factor ≥ 2
- [ ] Set min.insync.replicas ≥ 2
- [ ] Use persistent storage with backups
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation
- [ ] Set up pod disruption budgets
- [ ] Configure network policies
- [ ] Use dedicated node pools
- [ ] Configure affinity/anti-affinity
- [ ] Test failover scenarios
- [ ] Document runbooks
- [ ] Set up alerts

## Next Steps

1. Review [K8S_QUICK_START.md](K8S_QUICK_START.md) for immediate deployment
2. Read [K8S_DEPLOYMENT.md](K8S_DEPLOYMENT.md) for comprehensive guide
3. Test in non-production environment first
4. Plan migration strategy
5. Deploy to production

## Support

For issues:
1. Check logs: `kubectl logs kafka-0 -n db`
2. Check events: `kubectl describe pod kafka-0 -n db`
3. Verify config: `kubectl exec kafka-0 -n db -- cat /tmp/server.properties`
4. Review documentation in this directory

## References

- [Kafka KRaft Documentation](https://kafka.apache.org/documentation/#kraft)
- [KRaft Quickstart](https://kafka.apache.org/quickstart#quickstart_kafkaraft)
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Original Helm Chart Reference](../../../helm/databases/kafka)
