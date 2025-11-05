================================================================
           KAFKA TLS CONFIGURATION - SIMPLIFIED
================================================================

TLS is fully supported and configured as simply as possible.

SIMPLEST CONFIGURATION EVER
----------------------------
Just provide a certificate and key file via environment variables:

    KAFKA_SSL_CERT_FILE=/path/to/server-cert.pem
    KAFKA_SSL_KEY_FILE=/path/to/server-key.pem
    KAFKA_SSL_CA_FILE=/path/to/ca-cert.pem

The container automatically:
- Converts PEM to Java KeyStore (JKS) format
- Configures all SSL properties
- Starts Kafka with TLS enabled

No manual keystore management required!

QUICK START
-----------
1. Generate test certificates:
   ./generate-certs.sh

2. Start TLS cluster:
   podman-compose -f docker-compose-tls.yml up -d

3. Verify it's running:
   podman ps | grep kafka

USING YOUR OWN CERTIFICATES
----------------------------
Simply replace the generated files:

   cp your-server-cert.pem certs/kafka-1-cert.pem
   cp your-private-key.pem certs/kafka-1-key.pem
   cp your-ca-cert.pem certs/ca-cert.pem

Then restart. No configuration changes needed!

WHAT YOU GET
------------
- PLAINTEXT listener on port 9092/9095
- SSL listener on port 9094/9097
- Automatic certificate conversion
- Production-ready TLS 1.2/1.3
- Mutual TLS support

COMPARISON
----------
Traditional Kafka TLS Setup:
1. Generate certs
2. Create PKCS12 keystore
3. Import to JKS keystore
4. Create truststore
5. Configure 10+ properties
6. Debug password issues

This Setup:
1. Generate certs (or use your own)
2. Set 3 environment variables
3. Start container

DOCUMENTATION
-------------
- TLS_SETUP.md   - Complete guide with examples
- TLS_SUMMARY.txt - Quick reference

================================================================
