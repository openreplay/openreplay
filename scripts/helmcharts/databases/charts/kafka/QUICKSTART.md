# Kafka Helm Chart - Quick Start

## Basic Deployment (No TLS)

```bash
# Deploy Kafka with 2 replicas
helm install kafka . --namespace db --create-namespace

# Check status
kubectl get statefulset -n db
kubectl get pods -n db -l app.kubernetes.io/name=kafka

# Check services
kubectl get svc -n db -l app.kubernetes.io/name=kafka
```

## Access Kafka

```bash
# Get service endpoint
export KAFKA_BOOTSTRAP=$(kubectl get svc kafka -n db -o jsonpath='{.metadata.name}.{.metadata.namespace}.svc.cluster.local:9092')
echo $KAFKA_BOOTSTRAP

# Create a test pod
kubectl run kafka-client --rm -it --image=confluentinc/cp-kafka:latest --namespace db -- bash

# Inside the pod, test Kafka
kafka-topics --bootstrap-server kafka.db.svc.cluster.local:9092 --list
kafka-topics --bootstrap-server kafka.db.svc.cluster.local:9092 --create --topic test --partitions 1 --replication-factor 1
kafka-console-producer --bootstrap-server kafka.db.svc.cluster.local:9092 --topic test
# Type some messages and press Ctrl+C
kafka-console-consumer --bootstrap-server kafka.db.svc.cluster.local:9092 --topic test --from-beginning
```

## TLS Deployment

### 1. Generate Certificates

```bash
# Use the script from dockerfiles/kafka
cd ../../../../../dockerfiles/kafka
./generate-certs.sh

# Or generate manually (example)
openssl req -new -x509 -keyout ca-key.pem -out ca-cert.pem -days 365 -nodes -subj "/CN=kafka-ca"
```

### 2. Create TLS Secret

```bash
kubectl create secret generic kafka-tls-certs \
  --from-file=ca-cert.pem=./certs/ca-cert.pem \
  --from-file=kafka-0-cert.pem=./certs/kafka-0-cert.pem \
  --from-file=kafka-0-key.pem=./certs/kafka-0-key.pem \
  --from-file=kafka-1-cert.pem=./certs/kafka-1-cert.pem \
  --from-file=kafka-1-key.pem=./certs/kafka-1-key.pem \
  --namespace db
```

### 3. Deploy with TLS

```bash
helm install kafka . \
  --namespace db \
  --create-namespace \
  -f values-tls.yaml
```

### 4. Test TLS Connection

```bash
# Copy CA cert to local
kubectl get secret kafka-tls-certs -n db -o jsonpath='{.data.ca-cert\.pem}' | base64 -d > ca-cert.pem

# Create properties file
cat > client.properties << EOL
security.protocol=SSL
ssl.truststore.location=ca-cert.pem
ssl.truststore.type=PEM
EOL

# Test with kafka-console-consumer
kubectl run kafka-client --rm -it --image=confluentinc/cp-kafka:latest --namespace db -- bash
# Inside pod:
kafka-topics --bootstrap-server kafka-ssl.db.svc.cluster.local:9094 --command-config client.properties --list
```

## Custom Configuration

```bash
# Change replica count
helm install kafka . --namespace db --set replicaCount=3

# Adjust resources
helm install kafka . --namespace db \
  --set resources.requests.memory=2Gi \
  --set resources.limits.memory=4Gi

# Change storage size
helm install kafka . --namespace db \
  --set persistence.size=200Gi

# Disable persistence (not recommended for production)
helm install kafka . --namespace db --set persistence.enabled=false
```

## Scaling

```bash
# Scale up
helm upgrade kafka . --namespace db --set replicaCount=3

# Scale down (be careful with data)
helm upgrade kafka . --namespace db --set replicaCount=2
```

## Monitoring

```bash
# Watch pods
kubectl get pods -n db -w -l app.kubernetes.io/name=kafka

# Check logs
kubectl logs -n db kafka-0 -f

# Describe pod
kubectl describe pod kafka-0 -n db

# Check PVCs
kubectl get pvc -n db -l app.kubernetes.io/name=kafka
```

## Troubleshooting

### Pod Not Starting

```bash
# Check events
kubectl describe pod kafka-0 -n db

# Check logs
kubectl logs kafka-0 -n db

# Common issues:
# 1. Insufficient resources - adjust requests/limits
# 2. PVC not binding - check storage class
# 3. Certificate issues - verify secret contents
```

### Connection Issues

```bash
# Test internal connectivity
kubectl run test-pod --rm -it --image=busybox --namespace db -- sh
# Inside pod:
nc -zv kafka.db.svc.cluster.local 9092
nc -zv kafka-0.kafka-headless.db.svc.cluster.local 9092
```

### TLS Certificate Issues

```bash
# Verify secret
kubectl get secret kafka-tls-certs -n db -o yaml

# Check certificate expiration
kubectl get secret kafka-tls-certs -n db -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | openssl x509 -noout -dates
```

## Cleanup

```bash
# Delete Kafka
helm uninstall kafka --namespace db

# Delete PVCs (careful - this deletes data!)
kubectl delete pvc -n db -l app.kubernetes.io/name=kafka

# Delete namespace
kubectl delete namespace db
```

## Production Checklist

- [ ] Enable persistence
- [ ] Set appropriate resource limits
- [ ] Configure 3+ replicas for HA
- [ ] Enable TLS for security
- [ ] Configure proper storage class
- [ ] Set up monitoring (JMX, Prometheus)
- [ ] Configure backup strategy
- [ ] Test disaster recovery
- [ ] Document retention policies
- [ ] Set up alerting
