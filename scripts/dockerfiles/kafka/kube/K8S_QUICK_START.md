# Kubernetes Quick Start

## TL;DR

### PLAINTEXT Deployment (3 commands)

```bash
kubectl create namespace db
kubectl apply -f k8s-kafka-kraft.yaml
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kafka -n db --timeout=300s
```

Connect: `kafka.db.svc.cluster.local:9092`

### TLS Deployment (4 commands)

```bash
kubectl create namespace db
./k8s-generate-certs.sh
kubectl apply -f k8s-kafka-kraft-tls.yaml
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kafka -n db --timeout=300s
```

Connect:
- PLAINTEXT: `kafka.db.svc.cluster.local:9092`
- SSL: `kafka-ssl.db.svc.cluster.local:9094`

## Files

| File | Purpose |
|------|---------|
| `k8s-kafka-kraft.yaml` | PLAINTEXT deployment |
| `k8s-kafka-kraft-tls.yaml` | TLS-enabled deployment |
| `k8s-generate-certs.sh` | Generate TLS certificates |
| `K8S_DEPLOYMENT.md` | Complete deployment guide |

## Key Differences from Helm Chart

| Aspect | Old (Helm/ZooKeeper) | New (KRaft) |
|--------|---------------------|-------------|
| Dependencies | Requires ZooKeeper | No dependencies |
| Mode | ZooKeeper mode | KRaft mode |
| Pods | kafka + zookeeper | kafka only |
| Services | Same names | Same names |
| PVCs | Same names | Same names |
| Complexity | Higher | Lower |

## Testing

```bash
# Create test topic
kubectl run kafka-test -n db --rm -it --restart=Never \
  --image=your-registry/kafka:3 -- \
  /usr/lib/kafka/bin/kafka-topics.sh \
    --create --topic test \
    --bootstrap-server kafka.db.svc.cluster.local:9092 \
    --replication-factor 1 --partitions 3

# List topics
kubectl run kafka-test -n db --rm -it --restart=Never \
  --image=your-registry/kafka:3 -- \
  /usr/lib/kafka/bin/kafka-topics.sh \
    --list \
    --bootstrap-server kafka.db.svc.cluster.local:9092
```

## Common Operations

### View Logs

```bash
kubectl logs -n db kafka-0 --tail=50 -f
kubectl logs -n db kafka-1 --tail=50 -f
```

### Check Status

```bash
kubectl get pods -n db
kubectl get svc -n db
kubectl get pvc -n db
```

### Exec into Pod

```bash
kubectl exec -it kafka-0 -n db -- /bin/bash
```

### Restart Cluster

```bash
kubectl rollout restart statefulset/kafka -n db
```

### Delete Cluster (Keep Data)

```bash
kubectl delete statefulset kafka -n db
kubectl delete svc kafka kafka-headless -n db
# PVCs remain
```

### Delete Everything

```bash
kubectl delete namespace db
```

## Configuration

Edit the YAML manifest to customize:

**Message Size** (line ~140):
```yaml
- name: KAFKA_MESSAGE_MAX_BYTES
  value: "10485760"  # 10MB
```

**Retention** (line ~145):
```yaml
- name: KAFKA_LOG_RETENTION_HOURS
  value: "720"  # 30 days
```

**Storage** (line ~260):
```yaml
storage: "200Gi"  # Change size
```

**Resources** (line ~240):
```yaml
resources:
  requests:
    cpu: 1000m
    memory: 2Gi
  limits:
    cpu: 4000m
    memory: 8Gi
```

## Troubleshooting

### Pods Not Ready

```bash
kubectl describe pod kafka-0 -n db
kubectl logs kafka-0 -n db
```

### Connection Issues

```bash
kubectl run test -n db --rm -it --restart=Never \
  --image=busybox -- nc -zv kafka 9092
```

### PVC Issues

```bash
kubectl get pvc -n db
kubectl describe pvc data-kafka-0 -n db
```

## Next Steps

See [K8S_DEPLOYMENT.md](K8S_DEPLOYMENT.md) for complete documentation including:
- TLS configuration details
- Production checklist
- Scaling guide
- Migration from ZooKeeper
- Advanced troubleshooting
