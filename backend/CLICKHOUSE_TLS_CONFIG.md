# ClickHouse TLS Configuration

This document explains how to configure TLS/SSL connections to external ClickHouse instances in OpenReplay.

## Overview

OpenReplay now supports secure TLS/SSL connections to external ClickHouse databases. This is particularly useful when:

- Using a managed ClickHouse service that requires TLS
- Connecting to a remote ClickHouse instance over the internet
- Meeting security compliance requirements that mandate encrypted database connections

## Environment Variables

The following environment variables control ClickHouse TLS settings:

### Basic TLS Configuration

| Variable                     | Type    | Default | Description                                                        |
| ---------------------------- | ------- | ------- | ------------------------------------------------------------------ |
| `CLICKHOUSE_USE_TLS`         | boolean | `false` | Enable/disable TLS for ClickHouse connections                      |
| `CLICKHOUSE_TLS_SKIP_VERIFY` | boolean | `false` | Skip TLS certificate verification (not recommended for production) |

### Certificate Configuration

| Variable                   | Type   | Default | Description                                                      |
| -------------------------- | ------ | ------- | ---------------------------------------------------------------- |
| `CLICKHOUSE_TLS_CERT_PATH` | string | `""`    | Path to client TLS certificate file (PEM format)                 |
| `CLICKHOUSE_TLS_KEY_PATH`  | string | `""`    | Path to client TLS private key file (PEM format)                 |
| `CLICKHOUSE_TLS_CA_PATH`   | string | `""`    | Path to CA certificate file for server verification (PEM format) |

## Usage Examples

### 1. Basic TLS Connection (Server Certificate Verification)

For connections to ClickHouse instances with valid SSL certificates signed by a trusted CA:

```bash
export CLICKHOUSE_STRING="clickhouse-server.example.com:9440"
export CLICKHOUSE_USE_TLS=true
export CLICKHOUSE_DATABASE="default"
export CLICKHOUSE_USERNAME="myuser"
export CLICKHOUSE_PASSWORD="mypassword"
```

**Note:** Use port 9440 (or your TLS-enabled port) instead of the default 9000.

### 2. TLS with Custom CA Certificate

For self-signed certificates or private CAs:

```bash
export CLICKHOUSE_STRING="clickhouse-server.example.com:9440"
export CLICKHOUSE_USE_TLS=true
export CLICKHOUSE_TLS_CA_PATH="/path/to/ca-certificate.pem"
export CLICKHOUSE_DATABASE="default"
export CLICKHOUSE_USERNAME="myuser"
export CLICKHOUSE_PASSWORD="mypassword"
```

### 3. Mutual TLS (mTLS) with Client Certificates

For connections requiring client certificate authentication:

```bash
export CLICKHOUSE_STRING="clickhouse-server.example.com:9440"
export CLICKHOUSE_USE_TLS=true
export CLICKHOUSE_TLS_CERT_PATH="/path/to/client-cert.pem"
export CLICKHOUSE_TLS_KEY_PATH="/path/to/client-key.pem"
export CLICKHOUSE_TLS_CA_PATH="/path/to/ca-certificate.pem"
export CLICKHOUSE_DATABASE="default"
export CLICKHOUSE_USERNAME="myuser"
export CLICKHOUSE_PASSWORD="mypassword"
```

### 4. Skip Certificate Verification (Development Only)

**⚠️ WARNING: Not recommended for production use!**

```bash
export CLICKHOUSE_STRING="clickhouse-server.example.com:9440"
export CLICKHOUSE_USE_TLS=true
export CLICKHOUSE_TLS_SKIP_VERIFY=true
export CLICKHOUSE_DATABASE="default"
export CLICKHOUSE_USERNAME="myuser"
export CLICKHOUSE_PASSWORD="mypassword"
```

## Kubernetes/Helm Configuration

When deploying with Helm charts, you can set these values in your `values.yaml`:

```yaml
clickhouse:
  chHost: clickhouse-server.example.com
  service:
    webPort: 9440 # TLS port
  username: myuser
  password: mypassword
  useTLS: true
  tlsSkipVerify: false
  tlsCertPath: /etc/clickhouse-certs/client-cert.pem
  tlsKeyPath: /etc/clickhouse-certs/client-key.pem
  tlsCaPath: /etc/clickhouse-certs/ca-cert.pem
```

### Mounting Certificates in Kubernetes

Create a secret with your certificates:

```bash
kubectl create secret generic clickhouse-tls-certs \
  --from-file=client-cert.pem=/path/to/client-cert.pem \
  --from-file=client-key.pem=/path/to/client-key.pem \
  --from-file=ca-cert.pem=/path/to/ca-cert.pem \
  -n app
```

Then mount the secret in your deployment:

```yaml
volumes:
  - name: clickhouse-certs
    secret:
      secretName: clickhouse-tls-certs

volumeMounts:
  - name: clickhouse-certs
    mountPath: /etc/clickhouse-certs
    readOnly: true
```

## Certificate Requirements

### Certificate Formats

All certificates must be in PEM format. If you have certificates in other formats:

- **DER to PEM**: `openssl x509 -inform der -in certificate.cer -out certificate.pem`
- **PKCS12 to PEM**: `openssl pkcs12 -in certificate.pfx -out certificate.pem -nodes`

### File Permissions

Ensure proper permissions on certificate files:

```bash
chmod 600 /path/to/client-key.pem
chmod 644 /path/to/client-cert.pem
chmod 644 /path/to/ca-cert.pem
```

## Troubleshooting

### Common Issues

1. **Connection Timeout**

   - Ensure the ClickHouse server is configured for TLS on the specified port
   - Check firewall rules allow connections to the TLS port (usually 9440)

2. **Certificate Verification Failed**

   - Verify the CA certificate matches the one used to sign the server certificate
   - Check certificate expiration dates
   - Ensure certificate hostname matches the connection string

3. **TLS Handshake Errors**
   - Verify client certificate and key match (for mTLS)
   - Check that certificates are in PEM format
   - Ensure file paths are correct and accessible

### Debug Mode

To enable detailed TLS debugging, you can modify the Go code temporarily or check ClickHouse server logs for connection details.

### Testing Your Configuration

You can test TLS connectivity using the `clickhouse-client`:

```bash
clickhouse-client \
  --host=clickhouse-server.example.com \
  --port=9440 \
  --secure \
  --user=myuser \
  --password=mypassword \
  --query="SELECT 1"
```

## Security Best Practices

1. ✅ **Always use TLS** for connections over untrusted networks
2. ✅ **Use certificate verification** (`CLICKHOUSE_TLS_SKIP_VERIFY=false`) in production
3. ✅ **Protect private keys** with appropriate file permissions (600)
4. ✅ **Rotate certificates** before expiration
5. ✅ **Use mutual TLS (mTLS)** for enhanced security when possible
6. ❌ **Never commit certificates** or private keys to version control
7. ❌ **Avoid skip verify** except for local development/testing

## Compatibility

- Requires ClickHouse Go driver v2 (github.com/ClickHouse/clickhouse-go/v2)
- Compatible with ClickHouse server versions 20.3+
- Tested with both ClickHouse Cloud and self-hosted instances

## Related Documentation

- [ClickHouse TLS Documentation](https://clickhouse.com/docs/en/guides/sre/configuring-ssl/)
- [Go TLS Package](https://pkg.go.dev/crypto/tls)
- [OpenReplay Backend Configuration](./development.md)
