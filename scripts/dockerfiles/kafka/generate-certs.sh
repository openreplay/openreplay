#!/bin/bash
set -e

CERT_DIR="./certs"
VALIDITY_DAYS=365

mkdir -p "$CERT_DIR"

echo "=== Generating Kafka TLS Certificates ==="

# Generate CA
echo "1. Generating Certificate Authority (CA)..."
openssl req -new -x509 -keyout "$CERT_DIR/ca-key.pem" -out "$CERT_DIR/ca-cert.pem" -days $VALIDITY_DAYS -nodes \
  -subj "/C=US/ST=State/L=City/O=Kafka/CN=KafkaCA"

# Generate broker certificates
for i in 1 2; do
  echo "2. Generating certificate for kafka-$i..."
  
  # Generate private key
  openssl genrsa -out "$CERT_DIR/kafka-$i-key.pem" 2048
  
  # Generate CSR with SAN
  openssl req -new -key "$CERT_DIR/kafka-$i-key.pem" -out "$CERT_DIR/kafka-$i.csr" \
    -subj "/C=US/ST=State/L=City/O=Kafka/CN=kafka-$i" \
    -addext "subjectAltName=DNS:kafka-$i,DNS:localhost,IP:127.0.0.1"
  
  # Sign with CA
  openssl x509 -req -in "$CERT_DIR/kafka-$i.csr" \
    -CA "$CERT_DIR/ca-cert.pem" -CAkey "$CERT_DIR/ca-key.pem" \
    -CAcreateserial -out "$CERT_DIR/kafka-$i-cert.pem" \
    -days $VALIDITY_DAYS \
    -copy_extensions copy
  
  # Clean up CSR
  rm "$CERT_DIR/kafka-$i.csr"
  
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
echo "  Kafka-1 Cert:       $CERT_DIR/kafka-1-cert.pem"
echo "  Kafka-1 Key:        $CERT_DIR/kafka-1-key.pem"
echo "  Kafka-2 Cert:       $CERT_DIR/kafka-2-cert.pem"
echo "  Kafka-2 Key:        $CERT_DIR/kafka-2-key.pem"
echo ""
echo "✅ Ready to deploy with TLS!"
