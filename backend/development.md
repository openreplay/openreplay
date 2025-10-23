### Prerequisites

- [Vagrant](../scripts/vagrant/README.md)

### Building and deploying locally

```bash
cd openreplay-contributions
vagrant ssh
cd openreplay-dev/openreplay/scripts/helmcharts
# For complete list of options
# bash local_deploy.sh help
bash local_deploy.sh <worker name>
```

### ClickHouse TLS Configuration

For information on configuring secure TLS/SSL connections to external ClickHouse instances, see [CLICKHOUSE_TLS_CONFIG.md](./CLICKHOUSE_TLS_CONFIG.md).
