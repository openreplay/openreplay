#!/bin/bash
set -e

CONFIG_FILE="${1:-/usr/lib/kafka/config/kraft/server.properties}"
DATA_DIR="${KAFKA_LOG_DIRS:-/bitnami/kafka/data}"

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"

# Function to convert PEM to JKS if needed
setup_ssl_from_pem() {
    local CERT_FILE="$1"
    local KEY_FILE="$2"
    local CA_FILE="$3"
    local KEYSTORE_FILE="/tmp/kafka.keystore.jks"
    local TRUSTSTORE_FILE="/tmp/kafka.truststore.jks"
    local PASSWORD="kafka-ssl-pass"
    
    if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
        echo "Converting PEM certificates to JKS format..."
        
        # Convert PEM to PKCS12 first
        openssl pkcs12 -export \
            -in "$CERT_FILE" \
            -inkey "$KEY_FILE" \
            -out /tmp/kafka.p12 \
            -name kafka \
            -password pass:$PASSWORD
        
        # Convert PKCS12 to JKS keystore
        keytool -importkeystore \
            -srckeystore /tmp/kafka.p12 \
            -srcstoretype PKCS12 \
            -srcstorepass $PASSWORD \
            -destkeystore "$KEYSTORE_FILE" \
            -deststoretype JKS \
            -deststorepass $PASSWORD \
            -noprompt
        
        # Set keystore environment variables
        export KAFKA_SSL_KEYSTORE_LOCATION="$KEYSTORE_FILE"
        export KAFKA_SSL_KEYSTORE_PASSWORD="$PASSWORD"
        export KAFKA_SSL_KEY_PASSWORD="$PASSWORD"
        
        # Create truststore from CA (optional)
        if [ -f "$CA_FILE" ]; then
            keytool -import \
                -file "$CA_FILE" \
                -alias ca \
                -keystore "$TRUSTSTORE_FILE" \
                -storepass $PASSWORD \
                -noprompt \
                -storetype JKS
            
            export KAFKA_SSL_TRUSTSTORE_LOCATION="$TRUSTSTORE_FILE"
            export KAFKA_SSL_TRUSTSTORE_PASSWORD="$PASSWORD"
            echo "SSL certificates configured with CA truststore"
        else
            echo "SSL certificates configured without CA truststore"
        fi
        
        rm -f /tmp/kafka.p12
    fi
}

# Auto-configure SSL from PEM files if provided
if [ -n "$KAFKA_SSL_CERT_FILE" ] && [ -n "$KAFKA_SSL_KEY_FILE" ]; then
    setup_ssl_from_pem "$KAFKA_SSL_CERT_FILE" "$KAFKA_SSL_KEY_FILE" "$KAFKA_SSL_CA_FILE"
fi

# If environment variables are set, create a custom config
if [ -n "$KAFKA_NODE_ID" ]; then
    echo "Generating custom Kafka configuration for cluster mode..."
    CONFIG_FILE="/tmp/server.properties"
    
    # Copy base config
    cp /usr/lib/kafka/config/kraft/server.properties "$CONFIG_FILE"
    
    # Override with environment variables
    echo "node.id=${KAFKA_NODE_ID}" >> "$CONFIG_FILE"
    echo "process.roles=${KAFKA_PROCESS_ROLES:-broker,controller}" >> "$CONFIG_FILE"
    echo "listeners=${KAFKA_LISTENERS:-PLAINTEXT://:9092,CONTROLLER://:9093}" >> "$CONFIG_FILE"
    echo "advertised.listeners=${KAFKA_ADVERTISED_LISTENERS}" >> "$CONFIG_FILE"
    echo "controller.quorum.voters=${KAFKA_CONTROLLER_QUORUM_VOTERS}" >> "$CONFIG_FILE"
    echo "controller.listener.names=${KAFKA_CONTROLLER_LISTENER_NAMES:-CONTROLLER}" >> "$CONFIG_FILE"
    echo "inter.broker.listener.name=${KAFKA_INTER_BROKER_LISTENER_NAME:-PLAINTEXT}" >> "$CONFIG_FILE"
    echo "log.dirs=${DATA_DIR}" >> "$CONFIG_FILE"
    
    # Add SSL/TLS configuration if provided
    if [ -n "$KAFKA_LISTENER_SECURITY_PROTOCOL_MAP" ]; then
        echo "listener.security.protocol.map=${KAFKA_LISTENER_SECURITY_PROTOCOL_MAP}" >> "$CONFIG_FILE"
    fi
    
    if [ -n "$KAFKA_SSL_KEYSTORE_LOCATION" ]; then
        echo "ssl.keystore.location=${KAFKA_SSL_KEYSTORE_LOCATION}" >> "$CONFIG_FILE"
        echo "ssl.keystore.password=${KAFKA_SSL_KEYSTORE_PASSWORD}" >> "$CONFIG_FILE"
        echo "ssl.key.password=${KAFKA_SSL_KEY_PASSWORD}" >> "$CONFIG_FILE"
    fi
    
    if [ -n "$KAFKA_SSL_TRUSTSTORE_LOCATION" ]; then
        echo "ssl.truststore.location=${KAFKA_SSL_TRUSTSTORE_LOCATION}" >> "$CONFIG_FILE"
        echo "ssl.truststore.password=${KAFKA_SSL_TRUSTSTORE_PASSWORD}" >> "$CONFIG_FILE"
    fi
    
    if [ -n "$KAFKA_SSL_CLIENT_AUTH" ]; then
        echo "ssl.client.auth=${KAFKA_SSL_CLIENT_AUTH}" >> "$CONFIG_FILE"
    fi
    
    if [ -n "$KAFKA_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM" ]; then
        echo "ssl.endpoint.identification.algorithm=${KAFKA_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM}" >> "$CONFIG_FILE"
    fi
    
    # Message size configurations
    if [ -n "$KAFKA_MESSAGE_MAX_BYTES" ]; then
        echo "message.max.bytes=${KAFKA_MESSAGE_MAX_BYTES}" >> "$CONFIG_FILE"
    fi
    
    if [ -n "$KAFKA_REPLICA_FETCH_MAX_BYTES" ]; then
        echo "replica.fetch.max.bytes=${KAFKA_REPLICA_FETCH_MAX_BYTES}" >> "$CONFIG_FILE"
    fi
    
    # Retention configurations
    if [ -n "$KAFKA_LOG_RETENTION_HOURS" ]; then
        echo "log.retention.hours=${KAFKA_LOG_RETENTION_HOURS}" >> "$CONFIG_FILE"
    fi
    
    if [ -n "$KAFKA_LOG_RETENTION_BYTES" ]; then
        echo "log.retention.bytes=${KAFKA_LOG_RETENTION_BYTES}" >> "$CONFIG_FILE"
    fi
    
    if [ -n "$KAFKA_LOG_SEGMENT_BYTES" ]; then
        echo "log.segment.bytes=${KAFKA_LOG_SEGMENT_BYTES}" >> "$CONFIG_FILE"
    fi
    
    # Compression
    if [ -n "$KAFKA_COMPRESSION_TYPE" ]; then
        echo "compression.type=${KAFKA_COMPRESSION_TYPE}" >> "$CONFIG_FILE"
    fi
    
    # Generic way to add any Kafka property via KAFKA_CFG_ prefix
    # Example: KAFKA_CFG_NUM_NETWORK_THREADS=8 -> num.network.threads=8
    for var in $(env | grep '^KAFKA_CFG_'); do
        key=$(echo "$var" | sed -e 's/KAFKA_CFG_//' -e 's/=.*//' | tr '[:upper:]_' '[:lower:].')
        value=$(echo "$var" | sed -e 's/^[^=]*=//')
        echo "${key}=${value}" >> "$CONFIG_FILE"
    done
fi

# Use shared cluster ID for multi-node setup
CLUSTER_ID_FILE="/bitnami/kafka/cluster.id"
if [ ! -f "$DATA_DIR/meta.properties" ]; then
    echo "Formatting Kafka storage for KRaft mode..."
    
    # For multi-node cluster, use a shared cluster ID
    if [ -n "$KAFKA_CLUSTER_ID" ]; then
        CLUSTER_ID="$KAFKA_CLUSTER_ID"
    elif [ -f "$CLUSTER_ID_FILE" ]; then
        CLUSTER_ID=$(cat "$CLUSTER_ID_FILE")
    else
        CLUSTER_ID=$(/usr/lib/kafka/bin/kafka-storage.sh random-uuid)
        echo "$CLUSTER_ID" > "$CLUSTER_ID_FILE"
    fi
    
    echo "Using Cluster ID: $CLUSTER_ID"
    /usr/lib/kafka/bin/kafka-storage.sh format -t "$CLUSTER_ID" -c "$CONFIG_FILE"
fi

echo "Starting Kafka server with node.id=${KAFKA_NODE_ID:-1}..."
exec /usr/lib/kafka/bin/kafka-server-start.sh "$CONFIG_FILE"
