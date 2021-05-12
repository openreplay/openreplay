#!/bin/bash

cat <<EOF
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█░▄▄▀█░▄▄█░▄▄▀█░██░█░▄▄█░▄▄▀████░▄▄▀██░▄▄▀█░▄▄
█░▀▀░█▄▄▀█░▀▀░█░▀▀░█░▄▄█░▀▀▄████░██░██░▄▄▀█▄▄▀
█░██░█▄▄▄█▄██▄█▀▀▀▄█▄▄▄█▄█▄▄████░▀▀░██░▀▀░█▄▄▄
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
EOF


# Global vars
namespace=db
cwd=$PWD

# Array of dbs
dbs=("clickhouse" "kafka" "minio" "nfs-server-provisioner" "postgresql" "redis" "sqs")

echo in db $installation_type

# Based on the above variable and `type` which is inherited from the main script,
# Installation resource usgage will change
# _cpu/_memory * installation_type = resource_limit
#
# Basic limits for db resource
postgres_cpu=256
postgres_memory=512
clickhouse_cpu=256
clickhouse_memory=512
redis_cpu=128
redis_memory=512
kafka_cpu=256
kafka_memory=512
minio_cpu=256
minio_memory=512
nfs-server-provisioner_cpu=256
nfs-server-provisioner_memory=512
sqs_cpu=256
sqs_memory=512

# Installing all dbs
echo $(date) >> helm.log
for db in ${dbs[*]}; do
    {
        echo -e ${green}${bold}Installing $db${reset}
        helm upgrade --install -n db $db ./$db --wait --create-namespace &>> helm.log
        echo -e ${green}${bold}Done ✔${reset}
    } || {
        echo -e execution failed. Please check ${yello}$cwd/helm.log${reset} for more details.
        exit 1
    }
done

# Setting kubernetes namespace
kubectl config set-context --current --namespace=$namespace

# Initializing dbs

### Create topics:
echo -e ${green}${bold}Restoring kafka topics${reset}
kubectl exec kafka-0 -- /bin/bash -c "KAFKA_HEAP_OPTS=\"-Xms512m -Xmx1g\" /opt/bitnami/kafka/bin/kafka-topics.sh --create  --zookeeper kafka-zookeeper.${namespace}.svc.cluster.local:2181 --replication-factor 2 --partitions 16 --topic messages || true"
kubectl exec kafka-0 -- /bin/bash -c "KAFKA_HEAP_OPTS=\"-Xms512m -Xmx1g\" /opt/bitnami/kafka/bin/kafka-topics.sh --create  --zookeeper kafka-zookeeper.${namespace}.svc.cluster.local:2181 --replication-factor 2 --partitions 16 --topic events || true"
kubectl exec kafka-0 -- /bin/bash -c "KAFKA_HEAP_OPTS=\"-Xms512m -Xmx1g\" /opt/bitnami/kafka/bin/kafka-topics.sh --create  --zookeeper kafka-zookeeper.${namespace}.svc.cluster.local:2181 --replication-factor 2 --partitions 16 --topic raw || true"
kubectl exec kafka-0 -- /bin/bash -c "KAFKA_HEAP_OPTS=\"-Xms512m -Xmx1g\" /opt/bitnami/kafka/bin/kafka-topics.sh --create  --zookeeper kafka-zookeeper.${namespace}.svc.cluster.local:2181 --replication-factor 2 --partitions 16 --topic trigger || true"
### Set retention time:
kubectl exec kafka-0 -- /bin/bash -c "KAFKA_HEAP_OPTS=\"-Xms512m -Xmx1g\" /opt/bitnami/kafka/bin/kafka-configs.sh --zookeeper kafka-zookeeper.${namespace}.svc.cluster.local:2181 --entity-type topics --alter --add-config retention.ms=345600000 --entity-name messages"
kubectl exec kafka-0 -- /bin/bash -c "KAFKA_HEAP_OPTS=\"-Xms512m -Xmx1g\" /opt/bitnami/kafka/bin/kafka-configs.sh --zookeeper kafka-zookeeper.${namespace}.svc.cluster.local:2181 --entity-type topics --alter --add-config retention.ms=3456000000 --entity-name events"
kubectl exec kafka-0 -- /bin/bash -c "KAFKA_HEAP_OPTS=\"-Xms512m -Xmx1g\" /opt/bitnami/kafka/bin/kafka-configs.sh --zookeeper kafka-zookeeper.${namespace}.svc.cluster.local:2181 --entity-type topics --alter --add-config retention.ms=3456000000 --entity-name raw"
kubectl exec kafka-0 -- /bin/bash -c "KAFKA_HEAP_OPTS=\"-Xms512m -Xmx1g\" /opt/bitnami/kafka/bin/kafka-configs.sh --zookeeper kafka-zookeeper.${namespace}.svc.cluster.local:2181 --entity-type topics --alter --add-config retention.ms=3456000000 --entity-name trigger"
echo -e ${green}${bold}Done ✔${reset}

## Postgresql


cd init_dbs/postgresql
echo -e ${green}${bold}Restoring postgresql data${reset}
{
for file in $(ls *.sql); do
    echo -e ${green}${bold}Restoring $file ${reset}
    kubectl exec postgresql-postgresql-0 -- /bin/bash -c "rm -rf /tmp/$file"
    kubectl cp $file postgresql-postgresql-0:/tmp/
    kubectl exec postgresql-postgresql-0 -- /bin/bash -c "PGPASSWORD=asayerPostgres psql -U postgres -f /tmp/$file" &> $cwd/postgresql_init.log
    echo -e ${green}${bold}Done ✔${reset}
done
cd $cwd
} || {
    echo -e Postgres db init failed. Please check ${red}$cwd/postgresql_init.log${reset} for more details.
    exit 1
}

## clickhouse
cd init_dbs/clickhouse/create/
echo -e ${green}${bold}Restoring clickhouse data${reset}
for file in $(ls *.sql); do
{
    echo -e ${green}${bold}Restoring $file ${reset}
    kubectl exec clickhouse-0 -- /bin/bash -c "rm -rf /tmp/$file"
    kubectl cp $file clickhouse-0:/tmp/
    kubectl exec clickhouse-0 -- /bin/bash -c "clickhouse-client < /tmp/$file" 2>&1 | tee -a $cwd/clickhouse_init.log
    echo -e ${green}${bold}Done ✔${reset}
} || {
    echo -e Clickhouse db init failed. Please check ${red}$cwd/clickhouse_init.log${reset} for more details.
    exit 1
}
done
cd $cwd


## Minio
MINIO_ACCESS_KEY=$(kubectl get secret --namespace $namespace minio -o jsonpath="{.data.access-key}" | base64 --decode)
MINIO_SECRET_KEY=$(kubectl get secret --namespace $namespace minio -o jsonpath="{.data.secret-key}" | base64 --decode)
# Set bucket retention for minio
minio_pod=$(kubectl get po -n db -l app.kubernetes.io/name=minio -n db --output custom-columns=name:.metadata.name | tail -n+2)

kubectl cp -n db  bucket_policy.sh $minio_pod:/tmp/bucket_policy.sh
kubectl exec -n db $minio_pod -- sh /tmp/bucket_policy.sh $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

echo $MINIO_ACCESS_KEY
echo $MINIO_SECRET_KEY
