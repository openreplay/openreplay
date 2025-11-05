#!/bin/bash
set -e

CERT_DIR="./k8s-certs"
VALIDITY_DAYS=365
NAMESPACE="db"

mkdir -p "$CERT_DIR"

echo "=== Generating Kafka TLS Certificates for Kubernetes ==="

# Generate CA
echo "1. Generating Certificate Authority (CA)..."
openssl req -new -x509 -keyout "$CERT_DIR/ca-key.pem" -out "$CERT_DIR/ca-cert.pem" -days $VALIDITY_DAYS -nodes \
  -subj "/C=US/ST=State/L=City/O=Kafka/CN=KafkaCA"

# Generate broker certificates for StatefulSet pods
for i in 0 1; do
  echo "2. Generating certificate for kafka-$i..."
  
  # Generate private key
  openssl genrsa -out "$CERT_DIR/kafka-$i-key.pem" 2048
  
  # Generate CSR with SAN (include pod DNS names)
  cat > "$CERT_DIR/kafka-$i-san.conf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = Kafka
CN = kafka-$i.kafka-headless.db.svc.cluster.local

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = kafka-$i
DNS.2 = kafka-$i.kafka-headless
DNS.3 = kafka-$i.kafka-headless.db
DNS.4 = kafka-$i.kafka-headless.db.svc
DNS.5 = kafka-$i.kafka-headless.db.svc.cluster.local
DNS.6 = kafka-headless.db.svc.cluster.local
DNS.7 = localhost
IP.1 = 127.0.0.1
EOF
  
  # Generate CSR
  openssl req -new -key "$CERT_DIR/kafka-$i-key.pem" -out "$CERT_DIR/kafka-$i.csr" \
    -config "$CERT_DIR/kafka-$i-san.conf"
  
  # Sign with CA
  openssl x509 -req -in "$CERT_DIR/kafka-$i.csr" \
    -CA "$CERT_DIR/ca-cert.pem" -CAkey "$CERT_DIR/ca-key.pem" \
    -CAcreateserial -out "$CERT_DIR/kafka-$i-cert.pem" \
    -days $VALIDITY_DAYS \
    -extensions v3_req \
    -extfile "$CERT_DIR/kafka-$i-san.conf"
  
  # Clean up CSR and config
  rm "$CERT_DIR/kafka-$i.csr" "$CERT_DIR/kafka-$i-san.conf"
  
  echo "   ✓ Created kafka-$i-cert.pem and kafka-$i-key.pem"
done

# Set proper permissions
chmod 644 "$CERT_DIR"/*.pem
chmod 600 "$CERT_DIR"/*-key.pem

echo ""
echo "=== Certificate Generation Complete! ==="
echo ""
echo "Generated files:"
echo "  CA Certificate:     $CERT_DIR/ca-cert.pem"
echo "  Kafka-0 Cert:       $CERT_DIR/kafka-0-cert.pem"
echo "  Kafka-0 Key:        $CERT_DIR/kafka-0-key.pem"
echo "  Kafka-1 Cert:       $CERT_DIR/kafka-1-cert.pem"
echo "  Kafka-1 Key:        $CERT_DIR/kafka-1-key.pem"
echo ""
echo "=== Creating Kubernetes Secret ==="
echo ""
echo "Creating secret in namespace: $NAMESPACE"

kubectl create secret generic kafka-tls-certs \
  --from-file=ca-cert.pem="$CERT_DIR/ca-cert.pem" \
  --from-file=kafka-0-cert.pem="$CERT_DIR/kafka-0-cert.pem" \
  --from-file=kafka-0-key.pem="$CERT_DIR/kafka-0-key.pem" \
  --from-file=kafka-1-cert.pem="$CERT_DIR/kafka-1-cert.pem" \
  --from-file=kafka-1-key.pem="$CERT_DIR/kafka-1-key.pem" \
  -n "$NAMESPACE" \
  --dry-run=client -o yaml > "$CERT_DIR/kafka-tls-secret.yaml"

echo ""
echo "✅ Secret manifest created: $CERT_DIR/kafka-tls-secret.yaml"
echo ""
echo "To apply the secret, run:"
echo "  kubectl apply -f $CERT_DIR/kafka-tls-secret.yaml"
echo ""
echo "Or create directly:"
echo "  kubectl create secret generic kafka-tls-certs \\"
echo "    --from-file=ca-cert.pem=$CERT_DIR/ca-cert.pem \\"
echo "    --from-file=kafka-0-cert.pem=$CERT_DIR/kafka-0-cert.pem \\"
echo "    --from-file=kafka-0-key.pem=$CERT_DIR/kafka-0-key.pem \\"
echo "    --from-file=kafka-1-cert.pem=$CERT_DIR/kafka-1-cert.pem \\"
echo "    --from-file=kafka-1-key.pem=$CERT_DIR/kafka-1-key.pem \\"
echo "    -n $NAMESPACE"
echo ""
