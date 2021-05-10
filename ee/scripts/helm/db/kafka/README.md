# Kafka

[Kafka](https://www.kafka.org/) is a distributed streaming platform used for building real-time data pipelines and streaming apps. It is horizontally scalable, fault-tolerant, wicked fast, and runs in production in thousands of companies.

## TL;DR

```console
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install my-release bitnami/kafka
```

## Introduction

This chart bootstraps a [Kafka](https://github.com/bitnami/bitnami-docker-kafka) deployment on a [Kubernetes](http://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.

Bitnami charts can be used with [Kubeapps](https://kubeapps.com/) for deployment and management of Helm Charts in clusters. This Helm chart has been tested on top of [Bitnami Kubernetes Production Runtime](https://kubeprod.io/) (BKPR). Deploy BKPR to get automated TLS certificates, logging and monitoring for your applications.

## Prerequisites

- Kubernetes 1.12+
- Helm 2.12+ or Helm 3.0-beta3+
- PV provisioner support in the underlying infrastructure

## Installing the Chart

To install the chart with the release name `my-release`:

```console
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install my-release bitnami/kafka
```

These commands deploy Kafka on the Kubernetes cluster in the default configuration. The [Parameters](#parameters) section lists the parameters that can be configured during installation.

> **Tip**: List all releases using `helm list`

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```console
helm delete my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Parameters

The following tables lists the configurable parameters of the Kafka chart and their default values per section/component:

### Global parameters

| Parameter                                         | Description                                                                                                                       | Default                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `global.imageRegistry`                            | Global Docker image registry                                                                                                      | `nil`                                                   |
| `global.imagePullSecrets`                         | Global Docker registry secret names as an array                                                                                   | `[]` (does not add image pull secrets to deployed pods) |
| `global.storageClass`                             | Global storage class for dynamic provisioning                                                                                     | `nil`                                                   |

### Common parameters

| Parameter                                         | Description                                                                                                                       | Default                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `nameOverride`                                    | String to partially override kafka.fullname                                                                                       | `nil`                                                   |
| `fullnameOverride`                                | String to fully override kafka.fullname                                                                                           | `nil`                                                   |
| `clusterDomain`                                   | Default Kubernetes cluster domain                                                                                                 | `cluster.local`                                         |
| `commonLabels`                                    | Labels to add to all deployed objects                                                                                             | `{}`                                                    |
| `commonAnnotations`                               | Annotations to add to all deployed objects                                                                                        | `{}`                                                    |
| `extraDeploy`                                     | Array of extra objects to deploy with the release                                                                                 | `nil` (evaluated as a template)                         |

### Kafka parameters

| Parameter                                         | Description                                                                                                                       | Default                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `image.registry`                                  | Kafka image registry                                                                                                              | `docker.io`                                             |
| `image.repository`                                | Kafka image name                                                                                                                  | `bitnami/kafka`                                         |
| `image.tag`                                       | Kafka image tag                                                                                                                   | `{TAG_NAME}`                                            |
| `image.pullPolicy`                                | Kafka image pull policy                                                                                                           | `IfNotPresent`                                          |
| `image.pullSecrets`                               | Specify docker-registry secret names as an array                                                                                  | `[]` (does not add image pull secrets to deployed pods) |
| `image.debug`                                     | Set to true if you would like to see extra information on logs                                                                    | `false`                                                 |
| `config`                                          | Configuration file for Kafka. Auto-generated based on other parameters when not specified                                         | `nil`                                                   |
| `existingConfigmap`                               | Name of existing ConfigMap with Kafka configuration                                                                               | `nil`                                                   |
| `log4j`                                           | An optional log4j.properties file to overwrite the default of the Kafka brokers.                                                  | `nil`                                                   |
| `existingLog4jConfigMap`                          | The name of an existing ConfigMap containing a log4j.properties file.                                                             | `nil`                                                   |
| `heapOpts`                                        | Kafka's Java Heap size                                                                                                            | `-Xmx1024m -Xms1024m`                                   |
| `deleteTopicEnable`                               | Switch to enable topic deletion or not                                                                                            | `false`                                                 |
| `autoCreateTopicsEnable`                          | Switch to enable auto creation of topics. Enabling auto creation of topics not recommended for production or similar environments | `false`                                                 |
| `logFlushIntervalMessages`                        | The number of messages to accept before forcing a flush of data to disk                                                           | `10000`                                                 |
| `logFlushIntervalMs`                              | The maximum amount of time a message can sit in a log before we force a flush                                                     | `1000`                                                  |
| `logRetentionBytes`                               | A size-based retention policy for logs                                                                                            | `_1073741824`                                           |
| `logRetentionCheckIntervalMs`                     | The interval at which log segments are checked to see if they can be deleted                                                      | `300000`                                                |
| `logRetentionHours`                               | The minimum age of a log file to be eligible for deletion due to age                                                              | `168`                                                   |
| `logSegmentBytes`                                 | The maximum size of a log segment file. When this size is reached a new log segment will be created                               | `_1073741824`                                           |
| `logsDirs`                                        | A comma separated list of directories under which to store log files                                                              | `/bitnami/kafka/data`                                   |
| `maxMessageBytes`                                 | The largest record batch size allowed by Kafka                                                                                    | `1000012`                                               |
| `defaultReplicationFactor`                        | Default replication factors for automatically created topics                                                                      | `1`                                                     |
| `offsetsTopicReplicationFactor`                   | The replication factor for the offsets topic                                                                                      | `1`                                                     |
| `transactionStateLogReplicationFactor`            | The replication factor for the transaction topic                                                                                  | `1`                                                     |
| `transactionStateLogMinIsr`                       | Overridden min.insync.replicas config for the transaction topic                                                                   | `1`                                                     |
| `numIoThreads`                                    | The number of threads doing disk I/O                                                                                              | `8`                                                     |
| `numNetworkThreads`                               | The number of threads handling network requests                                                                                   | `3`                                                     |
| `numPartitions`                                   | The default number of log partitions per topic                                                                                    | `1`                                                     |
| `numRecoveryThreadsPerDataDir`                    | The number of threads per data directory to be used for log recovery at startup and flushing at shutdown                          | `1`                                                     |
| `socketReceiveBufferBytes`                        | The receive buffer (SO_RCVBUF) used by the socket server                                                                          | `102400`                                                |
| `socketRequestMaxBytes`                           | The maximum size of a request that the socket server will accept (protection against OOM)                                         | `_104857600`                                            |
| `socketSendBufferBytes`                           | The send buffer (SO_SNDBUF) used by the socket server                                                                             | `102400`                                                |
| `zookeeperConnectionTimeoutMs`                    | Timeout in ms for connecting to Zookeeper                                                                                         | `6000`                                                  |
| `extraEnvVars`                                    | Extra environment variables to add to kafka pods                                                                                  | `[]`                                                    |
| `extraVolumes`                                    | Extra volume(s) to add to Kafka statefulset                                                                                       | `[]`                                                    |
| `extraVolumeMounts`                               | Extra volumeMount(s) to add to Kafka containers                                                                                   | `[]`                                                    |
| `auth.clientProtocol`                             | Authentication protocol for communications with clients. Allowed protocols: `plaintext`, `tls`, `mtls`, `sasl` and `sasl_tls`     | `plaintext`                                             |
| `auth.interBrokerProtocol`                        | Authentication protocol for inter-broker communications. Allowed protocols: `plaintext`, `tls`, `mtls`, `sasl` and `sasl_tls`     | `plaintext`                                             |
| `auth.saslMechanisms`                             | SASL mechanisms when either `auth.interBrokerProtocol` or `auth.clientProtocol` are `sasl`. Allowed types: `plain`, `scram-sha-256`, `scram-sha-512` | `plain,scram-sha-256,scram-sha-512`  |
| `auth.saslInterBrokerMechanism`                   | SASL mechanism to use as inter broker protocol, it must be included at `auth.saslMechanisms`                                      | `plain`                                                 |
| `auth.jksSecret`                                  | Name of the existing secret containing the truststore and one keystore per Kafka broker you have in the cluster                   | `nil`                                                   |
| `auth.jksPassword`                                | Password to access the JKS files when they are password-protected                                                                 | `nil`                                                   |
| `auth.tlsEndpointIdentificationAlgorithm`         | The endpoint identification algorithm to validate server hostname using server certificate                                        | `https`                                                 |
| `auth.jaas.interBrokerUser`                       | Kafka inter broker communication user for SASL authentication                                                                     | `admin`                                                 |
| `auth.jaas.interBrokerPassword`                   | Kafka inter broker communication password for SASL authentication                                                                 | `nil`                                                   |
| `auth.jaas.zookeeperUser`                         | Kafka Zookeeper user for SASL authentication                                                                                      | `nil`                                                   |
| `auth.jaas.zookeeperPassword`                     | Kafka Zookeeper password for SASL authentication                                                                                  | `nil`                                                   |
| `auth.jaas.existingSecret`                        | Name of the existing secret containing credentials for brokerUser, interBrokerUser and zookeeperUser                              | `nil`                                                   |
| `auth.jaas.clientUsers`                           | List of Kafka client users to be created, separated by commas. This values will override `auth.jaas.clientUser`                   | `[]`                                                   |
| `auth.jaas.clientPasswords`                       | List of passwords for `auth.jaas.clientUsers`. It is mandatory to provide the passwords when using `auth.jaas.clientUsers`        | `[]`                                                   |
| `listeners`                                       | The address(es) the socket server listens on. Auto-calculated it's set to an empty array                                          | `[]`                                                    |
| `advertisedListeners`                             | The address(es) (hostname:port) the broker will advertise to producers and consumers. Auto-calculated it's set to an empty array  | `[]`                                                    |
| `listenerSecurityProtocolMap`                     | The protocol->listener mapping. Auto-calculated it's set to nil                                                                   | `nil`                                                   |
| `allowPlaintextListener`                          | Allow to use the PLAINTEXT listener                                                                                               | `true`                                                  |
| `interBrokerListenerName`                         | The listener that the brokers should communicate on                                                                               | `INTERNAL`                                              |

### Statefulset parameters

| Parameter                                         | Description                                                                                                                       | Default                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `replicaCount`                                    | Number of Kafka nodes                                                                                                             | `1`                                                     |
| `updateStrategy`                                  | Update strategy for the stateful set                                                                                              | `RollingUpdate`                                         |
| `rollingUpdatePartition`                          | Partition update strategy                                                                                                         | `nil`                                                   |
| `podLabels`                                       | Kafka pod labels                                                                                                                  | `{}` (evaluated as a template)                          |
| `podAnnotations`                                  | Kafka Pod annotations                                                                                                             | `{}` (evaluated as a template)                          |
| `affinity`                                        | Affinity for pod assignment                                                                                                       | `{}` (evaluated as a template)                          |
| `priorityClassName`                               | Name of the existing priority class to be used by kafka pods                                                                      |  `""`                                                   |
| `nodeSelector`                                    | Node labels for pod assignment                                                                                                    | `{}` (evaluated as a template)                          |
| `tolerations`                                     | Tolerations for pod assignment                                                                                                    | `[]` (evaluated as a template)                          |
| `podSecurityContext`                              | Kafka pods' Security Context                                                                                                      | `{}`                                                    |
| `containerSecurityContext`                        | Kafka containers' Security Context                                                                                                | `{}`                                                    |
| `resources.limits`                                | The resources limits for Kafka containers                                                                                         | `{}`                                                    |
| `resources.requests`                              | The requested resources for Kafka containers                                                                                      | `{}`                                                    |
| `livenessProbe`                                   | Liveness probe configuration for Kafka                                                                                            | `Check values.yaml file`                                |
| `readinessProbe`                                  | Readiness probe configuration for Kafka                                                                                           | `Check values.yaml file`                                |
| `customLivenessProbe`                             | Custom Liveness probe configuration for Kafka                                                                                     | `{}`                                                    |
| `customReadinessProbe`                            | Custom Readiness probe configuration for Kafka                                                                                    | `{}`                                                    |
| `pdb.create`                                      | Enable/disable a Pod Disruption Budget creation                                                                                   | `false`                                                 |
| `pdb.minAvailable`                                | Minimum number/percentage of pods that should remain scheduled                                                                    | `nil`                                                   |
| `pdb.maxUnavailable`                              | Maximum number/percentage of pods that may be made unavailable                                                                    | `1`                                                     |
| `command`                                         | Override kafka container command                                                                                                  | `['/scripts/setup.sh']`  (evaluated as a template)      |
| `args`                                            | Override kafka container arguments                                                                                                | `[]` (evaluated as a template)                          |
| `sidecars`                                        | Attach additional sidecar containers to the Kafka pod                                                                             | `{}`                                                    |

### Exposure parameters

| Parameter                                         | Description                                                                                                                       | Default                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `service.type`                                    | Kubernetes Service type                                                                                                           | `ClusterIP`                                             |
| `service.port`                                    | Kafka port for client connections                                                                                                 | `9092`                                                  |
| `service.internalPort`                            | Kafka port for inter-broker connections                                                                                           | `9093`                                                  |
| `service.externalPort`                            | Kafka port for external connections                                                                                               | `9094`                                                  |
| `service.nodePorts.client`                        | Nodeport for client connections                                                                                                   | `""`                                                    |
| `service.nodePorts.external`                      | Nodeport for external connections                                                                                                 | `""`                                                    |
| `service.loadBalancerIP`                          | loadBalancerIP for Kafka Service                                                                                                  | `nil`                                                   |
| `service.loadBalancerSourceRanges`                | Address(es) that are allowed when service is LoadBalancer                                                                         | `[]`                                                    |
| `service.annotations`                             | Service annotations                                                                                                               | `{}`(evaluated as a template)                           |
| `externalAccess.enabled`                          | Enable Kubernetes external cluster access to Kafka brokers                                                                        | `false`                                                 |
| `externalAccess.autoDiscovery.enabled`            | Enable using an init container to auto-detect external IPs/ports by querying the K8s API                                          | `false`                                                 |
| `externalAccess.autoDiscovery.image.registry`     | Init container auto-discovery image registry (kubectl)                                                                            | `docker.io`                                             |
| `externalAccess.autoDiscovery.image.repository`   | Init container auto-discovery image name (kubectl)                                                                                | `bitnami/kubectl`                                       |
| `externalAccess.autoDiscovery.image.tag`          | Init container auto-discovery image tag (kubectl)                                                                                 | `{TAG_NAME}`                                            |
| `externalAccess.autoDiscovery.image.pullPolicy`   | Init container auto-discovery image pull policy (kubectl)                                                                         | `Always`                                                |
| `externalAccess.autoDiscovery.resources.limits`   | Init container auto-discovery resource limits                                                                                     | `{}`                                                    |
| `externalAccess.autoDiscovery.resources.requests` | Init container auto-discovery resource requests                                                                                   | `{}`                                                    |
| `externalAccess.service.type`                     | Kubernetes Servive type for external access. It can be NodePort or LoadBalancer                                                   | `LoadBalancer`                                          |
| `externalAccess.service.port`                     | Kafka port used for external access when service type is LoadBalancer                                                             | `9094`                                                  |
| `externalAccess.service.loadBalancerIPs`          | Array of load balancer IPs for Kafka brokers                                                                                      | `[]`                                                    |
| `externalAccess.service.loadBalancerSourceRanges` | Address(es) that are allowed when service is LoadBalancer                                                                         | `[]`                                                    |
| `externalAccess.service.domain`                   | Domain or external ip used to configure Kafka external listener when service type is NodePort                                     | `nil`                                                   |
| `externalAccess.service.nodePorts`                | Array of node ports used to configure Kafka external listener when service type is NodePort                                       | `[]`                                                    |
| `externalAccess.service.annotations`              | Service annotations for external access                                                                                           | `{}`(evaluated as a template)                           |

### Persistence parameters

| Parameter                                         | Description                                                                                                                       | Default                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `persistence.enabled`                             | Enable Kafka data persistence using PVC, note that Zookeeper persistence is unaffected                                            | `true`                                                  |
| `persistence.existingClaim`                       | Provide an existing `PersistentVolumeClaim`, the value is evaluated as a template                                                 | `nil`                                                   |
| `persistence.storageClass`                        | PVC Storage Class for Kafka data volume                                                                                           | `nil`                                                   |
| `persistence.accessMode`                          | PVC Access Mode for Kafka data volume                                                                                             | `ReadWriteOnce`                                         |
| `persistence.size`                                | PVC Storage Request for Kafka data volume                                                                                         | `8Gi`                                                   |
| `persistence.annotations`                         | Annotations for the PVC                                                                                                           | `{}`(evaluated as a template)                           |

### RBAC parameters

| Parameter                                         | Description                                                                                                                       | Default                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `serviceAccount.create`                           | Enable creation of ServiceAccount for Kafka pods                                                                                  | `true`                                                  |
| `serviceAccount.name`                             | Name of the created serviceAccount                                                                                                | Generated using the `kafka.fullname` template           |
| `rbac.create`                                     | Weather to create & use RBAC resources or not                                                                                     | `false`                                                 |

### Volume Permissions parameters

| Parameter                                         | Description                                                                                                                       | Default                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `volumePermissions.enabled`                       | Enable init container that changes the owner and group of the persistent volume(s) mountpoint to `runAsUser:fsGroup`              | `false`                                                 |
| `volumePermissions.image.registry`                | Init container volume-permissions image registry                                                                                  | `docker.io`                                             |
| `volumePermissions.image.repository`              | Init container volume-permissions image name                                                                                      | `bitnami/minideb`                                       |
| `volumePermissions.image.tag`                     | Init container volume-permissions image tag                                                                                       | `buster`                                                |
| `volumePermissions.image.pullPolicy`              | Init container volume-permissions image pull policy                                                                               | `Always`                                                |
| `volumePermissions.image.pullSecrets`             | Specify docker-registry secret names as an array                                                                                  | `[]` (does not add image pull secrets to deployed pods) |
| `volumePermissions.resources.limits`              | Init container volume-permissions resource  limits                                                                                | `{}`                                                    |
| `volumePermissions.resources.requests`            | Init container volume-permissions resource  requests                                                                              | `{}`                                                    |

### Metrics parameters

| Parameter                                         | Description                                                                                                                       | Default                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `metrics.kafka.enabled`                           | Whether or not to create a standalone Kafka exporter to expose Kafka metrics                                                      | `false`                                                 |
| `metrics.kafka.image.registry`                    | Kafka exporter image registry                                                                                                     | `docker.io`                                             |
| `metrics.kafka.image.repository`                  | Kafka exporter image name                                                                                                         | `bitnami/kafka-exporter`                                |
| `metrics.kafka.image.tag`                         | Kafka exporter image tag                                                                                                          | `{TAG_NAME}`                                            |
| `metrics.kafka.image.pullPolicy`                  | Kafka exporter image pull policy                                                                                                  | `IfNotPresent`                                          |
| `metrics.kafka.image.pullSecrets`                 | Specify docker-registry secret names as an array                                                                                  | `[]` (does not add image pull secrets to deployed pods) |
| `metrics.kafka.extraFlags`                        | Extra flags to be passed to Kafka exporter                                                                                        | `{}`                                                    |
| `metrics.kafka.certificatesSecret`                | Name of the existing secret containing the optional certificate and key files                                                     | `nil`                                                   |
| `metrics.kafka.resources.limits`                  | Kafka Exporter container resource limits                                                                                          | `{}`                                                    |
| `metrics.kafka.resources.requests`                | Kafka Exporter container resource requests                                                                                        | `{}`                                                    |
| `metrics.kafka.service.type`                      | Kubernetes service type (`ClusterIP`, `NodePort` or `LoadBalancer`) for Kafka Exporter                                            | `ClusterIP`                                             |
| `metrics.kafka.service.port`                      | Kafka Exporter Prometheus port                                                                                                    | `9308`                                                  |
| `metrics.kafka.service.nodePort`                  | Kubernetes HTTP node port                                                                                                         | `""`                                                    |
| `metrics.kafka.service.annotations`               | Annotations for Prometheus metrics service                                                                                        | `Check values.yaml file`                                |
| `metrics.kafka.service.loadBalancerIP`            | loadBalancerIP if service type is `LoadBalancer`                                                                                  | `nil`                                                   |
| `metrics.kafka.service.clusterIP`                 | Static clusterIP or None for headless services                                                                                    | `nil`                                                   |
| `metrics.jmx.enabled`                             | Whether or not to expose JMX metrics to Prometheus                                                                                | `false`                                                 |
| `metrics.jmx.image.registry`                      | JMX exporter image registry                                                                                                       | `docker.io`                                             |
| `metrics.jmx.image.repository`                    | JMX exporter image name                                                                                                           | `bitnami/jmx-exporter`                                  |
| `metrics.jmx.image.tag`                           | JMX exporter image tag                                                                                                            | `{TAG_NAME}`                                            |
| `metrics.jmx.image.pullPolicy`                    | JMX exporter image pull policy                                                                                                    | `IfNotPresent`                                          |
| `metrics.jmx.image.pullSecrets`                   | Specify docker-registry secret names as an array                                                                                  | `[]` (does not add image pull secrets to deployed pods) |
| `metrics.jmx.resources.limits`                    | JMX Exporter container resource limits                                                                                            | `{}`                                                    |
| `metrics.jmx.resources.requests`                  | JMX Exporter container resource requests                                                                                          | `{}`                                                    |
| `metrics.jmx.service.type`                        | Kubernetes service type (`ClusterIP`, `NodePort` or `LoadBalancer`) for JMX Exporter                                              | `ClusterIP`                                             |
| `metrics.jmx.service.port`                        | JMX Exporter Prometheus port                                                                                                      | `5556`                                                  |
| `metrics.jmx.service.nodePort`                    | Kubernetes HTTP node port                                                                                                         | `""`                                                    |
| `metrics.jmx.service.annotations`                 | Annotations for Prometheus metrics service                                                                                        | `Check values.yaml file`                                |
| `metrics.jmx.service.loadBalancerIP`              | loadBalancerIP if service type is `LoadBalancer`                                                                                  | `nil`                                                   |
| `metrics.jmx.service.clusterIP`                   | Static clusterIP or None for headless services                                                                                    | `nil`                                                   |
| `metrics.jmx.whitelistObjectNames`                | Allows setting which JMX objects you want to expose to via JMX stats to JMX Exporter                                              | (see `values.yaml`)                                     |
| `metrics.jmx.config`                              | Configuration file for JMX exporter                                                                                               | (see `values.yaml`)                                     |
| `metrics.jmx.existingConfigmap`                   | Name of existing ConfigMap with JMX exporter configuration                                                                        | `nil`                                                   |
| `metrics.serviceMonitor.enabled`                  | if `true`, creates a Prometheus Operator ServiceMonitor (requires `metrics.kafka.enabled` or `metrics.jmx.enabled` to be `true`)  | `false`                                                 |
| `metrics.serviceMonitor.namespace`                | Namespace which Prometheus is running in                                                                                          | `monitoring`                                            |
| `metrics.serviceMonitor.interval`                 | Interval at which metrics should be scraped                                                                                       | `nil`                                                   |
| `metrics.serviceMonitor.scrapeTimeout`            | Timeout after which the scrape is ended                                                                                           | `nil` (Prometheus Operator default value)               |
| `metrics.serviceMonitor.selector`                 | ServiceMonitor selector labels                                                                                                    | `nil` (Prometheus Operator default value)               |

### Zookeeper chart parameters

| Parameter                                         | Description                                                                                                                       | Default                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `zookeeper.enabled`                               | Switch to enable or disable the Zookeeper helm chart                                                                              | `true`                                                  |
| `zookeeper.persistence.enabled`                   | Enable Zookeeper persistence using PVC                                                                                            | `true`                                                  |
| `externalZookeeper.servers`                       | Server or list of external Zookeeper servers to use                                                                               | `[]`                                                    |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example,

```console
helm install my-release \
  --set replicaCount=3 \
  bitnami/kafka
```

The above command deploys Kafka with 3 brokers (replicas).

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```console
helm install my-release -f values.yaml bitnami/kafka
```

> **Tip**: You can use the default [values.yaml](values.yaml)

## Configuration and installation details

### [Rolling VS Immutable tags](https://docs.bitnami.com/containers/how-to/understand-rolling-tags-containers/)

It is strongly recommended to use immutable tags in a production environment. This ensures your deployment does not change automatically if the same tag is updated with a different image.

Bitnami will release a new chart updating its containers if a new version of the main container, significant changes, or critical vulnerabilities exist.

### Production configuration and horizontal scaling

This chart includes a `values-production.yaml` file where you can find some parameters oriented to production configuration in comparison to the regular `values.yaml`. You can use this file instead of the default one.

- Number of Kafka nodes:

```diff
- replicaCount: 1
+ replicaCount: 3
```

- Allow to use the PLAINTEXT listener:

```diff
- allowPlaintextListener: true
+ allowPlaintextListener: false
```

- Default replication factors for automatically created topics:

```diff
- defaultReplicationFactor: 1
+ defaultReplicationFactor: 3
```

- Allow auto creation of topics.

```diff
- autoCreateTopicsEnable: true
+ autoCreateTopicsEnable: false
```

- The replication factor for the offsets topic:

```diff
- offsetsTopicReplicationFactor: 1
+ offsetsTopicReplicationFactor: 3
```

- The replication factor for the transaction topic:

```diff
- transactionStateLogReplicationFactor: 1
+ transactionStateLogReplicationFactor: 3
```

- Overridden min.insync.replicas config for the transaction topic:

```diff
- transactionStateLogMinIsr: 1
+ transactionStateLogMinIsr: 3
```

- Switch to enable the Kafka SASAL authentication on client and inter-broker communications:

```diff
- auth.clientProtocol: plaintext
+ auth.clientProtocol: sasl
- auth.interBrokerProtocol: plaintext
+ auth.interBrokerProtocol: sasl
```

- Enable Zookeeper authentication:

```diff
+ auth.jaas.zookeeperUser: zookeeperUser
+ auth.jaas.zookeeperPassword: zookeeperPassword
- zookeeper.auth.enabled: false
+ zookeeper.auth.enabled: true
+ zookeeper.auth.clientUser: zookeeperUser
+ zookeeper.auth.clientPassword: zookeeperPassword
+ zookeeper.auth.serverUsers: zookeeperUser
+ zookeeper.auth.serverPasswords: zookeeperPassword
```

- Enable Pod Disruption Budget:

```diff
- pdb.create: false
+ pdb.create: true
```

- Create a separate Kafka metrics exporter:

```diff
- metrics.kafka.enabled: false
+ metrics.kafka.enabled: true
```

- Expose JMX metrics to Prometheus:

```diff
- metrics.jmx.enabled: false
+ metrics.jmx.enabled: true
```

- Enable Zookeeper metrics:

```diff
+ zookeeper.metrics.enabled: true
```

To horizontally scale this chart once it has been deployed, you can upgrade the statefulset using a new value for the `replicaCount` parameter. Please note that, when enabling TLS encryption, you must update your JKS secret including the keystore for the new replicas.

### Setting custom parameters

Any environment variable beginning with `KAFKA_CFG_` will be mapped to its corresponding Kafka key. For example, use `KAFKA_CFG_BACKGROUND_THREADS` in order to set `background.threads`. In order to pass custom environment variables use the `extraEnvVars` property.

### Listeners configuration

This chart allows you to automatically configure Kafka with 3 listeners:

- One for inter-broker communications.
- A second one for communications with clients within the K8s cluster.
- (optional) a third listener for communications with clients outside the K8s cluster. Check [this section](#accessing-kafka-brokers-from-outside-the-clusters) for more information.

For more complex configurations, set the `listeners`, `advertisedListeners` and `listenerSecurityProtocolMap` parameters as needed.

### Enable security for Kafka and Zookeeper

You can configure different authentication protocols for each listener you configure in Kafka. For instance, you can use `sasl_tls` authentication for client communications, while using `tls` for inter-broker communications. This table shows the available protocols and the security they provide:

| Method    | Authentication                | Encryption via TLS |
|-----------|-------------------------------|--------------------|
| plaintext | None                          | No                 |
| tls       | None                          | Yes                |
| mtls      | Yes (two-way authentication)  | Yes                |
| sasl      | Yes (via SASL)                | No                 |
| sasl_tls  | Yes (via SASL)                | Yes                |

If you enabled SASL authentication on any listener, you can set the SASL credentials using the parameters below:

- `auth.jaas.clientUsers`/`auth.jaas.clientPasswords`: when enabling SASL authentication for communications with clients.
- `auth.jaas.interBrokerUser`/`auth.jaas.interBrokerPassword`:  when enabling SASL authentication for inter-broker communications.
- `auth.jaas.zookeeperUser`/`auth.jaas.zookeeperPassword`: In the case that the Zookeeper chart is deployed with SASL authentication enabled.

In order to configure TLS authentication/encryption, you **must** create a secret containing the Java Key Stores (JKS) files: the truststore (`kafka.truststore.jks`) and one keystore (`kafka.keystore.jks`) per Kafka broker you have in the cluster. Then, you need pass the secret name with the `--auth.jksSecret` parameter when deploying the chart.

> **Note**: If the JKS files are password protected (recommended), you will need to provide the password to get access to the keystores. To do so, use the `auth.jksPassword` parameter to provide your password.

For instance, to configure TLS authentication on a Kafka cluster with 2 Kafka brokers use the command below to create the secret:

```console
kubectl create secret generic kafka-jks --from-file=./kafka.truststore.jks --from-file=./kafka-0.keystore.jks --from-file=./kafka-1.keystore.jks
```

> **Note**: the command above assumes you already created the trustore and keystores files. This [script](https://raw.githubusercontent.com/confluentinc/confluent-platform-security-tools/master/kafka-generate-ssl.sh) can help you with the JKS files generation.

As an alternative to manually create the secret before installing the chart, you can put your JKS files inside the chart folder `files/jks`, an a secret including them will be generated. Please note this alternative requires to have the chart downloaded locally, so you will have to clone this repository or fetch the chart before installing it.

You can deploy the chart with authentication using the following parameters:

```console
replicaCount=2
auth.clientProtocol=sasl
auth.interBrokerProtocol=tls
auth.certificatesSecret=kafka-jks
auth.certificatesPassword=jksPassword
auth.jaas.clientUsers[0]=brokerUser
auth.jaas.clientPassword[0]=brokerPassword
auth.jaas.zookeeperUser=zookeeperUser
auth.jaas.zookeeperPassword=zookeeperPassword
zookeeper.auth.enabled=true
zookeeper.auth.serverUsers=zookeeperUser
zookeeper.auth.serverPasswords=zookeeperPassword
zookeeper.auth.clientUser=zookeeperUser
zookeeper.auth.clientPassword=zookeeperPassword
```

If you also enable exposing metrics using the Kafka expoter, and you are using `sasl_tls`, `tls`, or `mtls` authentication protocols, you need to mount the CA certificated used to sign the brokers certificates in the exporter so it can validate the Kafka brokers. To do so, create a secret containing the CA, and set the `metrics.certificatesSecret` parameter. As an alternative, you can skip TLS validation using extra flags:

```console
metrics.kafka.extraFlags={tls.insecure-skip-tls-verify: ""}
```

### Accessing Kafka brokers from outside the cluster

In order to access Kafka Brokers from outside the cluster, an additional listener and advertised listener must be configured. Additionally, a specific service per kafka pod will be created.

There are two ways of configuring external access. Using LoadBalancer services or using NodePort services.

#### Using LoadBalancer services

You have two alternatives to use LoadBalancer services:

- Option A) Use random load balancer IPs using an **initContainer** that waits for the IPs to be ready and discover them automatically.

```console
externalAccess.enabled=true
externalAccess.service.type=LoadBalancer
externalAccess.service.port=9094
externalAccess.autoDiscovery.enabled=true
serviceAccount.create=true
rbac.create=true
```

Note: This option requires creating RBAC rules on clusters where RBAC policies are enabled.

- Option B) Manually specify the load balancer IPs:

```console
externalAccess.enabled=true
externalAccess.service.type=LoadBalancer
externalAccess.service.port=9094
externalAccess.service.loadBalancerIPs[0]='external-ip-1'
externalAccess.service.loadBalancerIPs[1]='external-ip-2'}
```

Note: You need to know in advance the load balancer IPs so each Kafka broker advertised listener is configured with it.

#### Using NodePort services

You have two alternatives to use NodePort services:

- Option A) Use random node ports using an **initContainer** that discover them automatically.

```console
externalAccess.enabled=true
externalAccess.service.type=NodePort
externalAccess.autoDiscovery.enabled=true
serviceAccount.create=true
rbac.create=true
```

Note: This option requires creating RBAC rules on clusters where RBAC policies are enabled.

- Option B) Manually specify the node ports:

```console
externalAccess.enabled=true
externalAccess.service.type=NodePort
externalAccess.serivce.nodePorts[0]='node-port-1'
externalAccess.serivce.nodePorts[1]='node-port-2'
```

Note: You need to know in advance the node ports that will be exposed so each Kafka broker advertised listener is configured with it.

The pod will try to get the external ip of the node using `curl -s https://ipinfo.io/ip` unless `externalAccess.service.domain` is provided.

Following the aforementioned steps will also allow to connect the brokers from the outside using the cluster's default service (when `service.type` is `LoadBalancer` or `NodePort`). Use the property `service.externalPort` to specify the port used for external connections.

### Sidecars

If you have a need for additional containers to run within the same pod as Kafka (e.g. an additional metrics or logging exporter), you can do so via the `sidecars` config parameter. Simply define your container according to the Kubernetes container spec.

```yaml
sidecars:
  - name: your-image-name
    image: your-image
    imagePullPolicy: Always
    ports:
      - name: portname
       containerPort: 1234
```

### Deploying extra resources

There are cases where you may want to deploy extra objects, such as Kafka Connect. For covering this case, the chart allows adding the full specification of other objects using the `extraDeploy` parameter. The following example would create a deployment including a Kafka Connect deployment so you can connnect Kafka with MongoDB:

```yaml
## Extra objects to deploy (value evaluated as a template)
##
extraDeploy: |-
  - apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: {{ include "kafka.fullname" . }}-connect
      labels: {{- include "kafka.labels" . | nindent 6 }}
        app.kubernetes.io/component: connector
    spec:
      replicas: 1
      selector:
        matchLabels: {{- include "kafka.matchLabels" . | nindent 8 }}
          app.kubernetes.io/component: connector
      template:
        metadata:
          labels: {{- include "kafka.labels" . | nindent 10 }}
            app.kubernetes.io/component: connector
        spec:
          containers:
            - name: connect
              image: KAFKA-CONNECT-IMAGE
              imagePullPolicy: IfNotPresent
              ports:
                - name: connector
                  containerPort: 8083
              volumeMounts:
                - name: configuration
                  mountPath: /opt/bitnami/kafka/config
          volumes:
            - name: configuration
              configMap:
                name: {{ include "kafka.fullname" . }}-connect
  - apiVersion: v1
    kind: ConfigMap
    metadata:
      name: {{ include "kafka.fullname" . }}-connect
      labels: {{- include "kafka.labels" . | nindent 6 }}
        app.kubernetes.io/component: connector
    data:
      connect-standalone.properties: |-
        bootstrap.servers = {{ include "kafka.fullname" . }}-0.{{ include "kafka.fullname" . }}-headless.{{ .Release.Namespace }}.svc.{{ .Values.clusterDomain }}:{{ .Values.service.port }}
        ...
      mongodb.properties: |-
        connection.uri=mongodb://root:password@mongodb-hostname:27017
        ...
  - apiVersion: v1
    kind: Service
    metadata:
      name: {{ include "kafka.fullname" . }}-connect
      labels: {{- include "kafka.labels" . | nindent 6 }}
        app.kubernetes.io/component: connector
    spec:
      ports:
        - protocol: TCP
          port: 8083
          targetPort: connector
      selector: {{- include "kafka.matchLabels" . | nindent 6 }}
        app.kubernetes.io/component: connector
```

You can create the Kafka Connect image using the Dockerfile below:

```Dockerfile
FROM bitnami/kafka:latest
# Download MongoDB Connector for Apache Kafka https://www.confluent.io/hub/mongodb/kafka-connect-mongodb
RUN mkdir -p /opt/bitnami/kafka/plugins && \
    cd /opt/bitnami/kafka/plugins && \
    curl --remote-name --location --silent https://search.maven.org/remotecontent?filepath=org/mongodb/kafka/mongo-kafka-connect/1.2.0/mongo-kafka-connect-1.2.0-all.jar
CMD /opt/bitnami/kafka/bin/connect-standalone.sh /opt/bitnami/kafka/config/connect-standalone.properties /opt/bitnami/kafka/config/mongo.properties
```

## Persistence

The [Bitnami Kafka](https://github.com/bitnami/bitnami-docker-kafka) image stores the Kafka data at the `/bitnami/kafka` path of the container.

Persistent Volume Claims are used to keep the data across deployments. This is known to work in GCE, AWS, and minikube. See the [Parameters](#persistence-parameters) section to configure the PVC or to disable persistence.

### Adjust permissions of persistent volume mountpoint

As the image run as non-root by default, it is necessary to adjust the ownership of the persistent volume so that the container can write data into it.

By default, the chart is configured to use Kubernetes Security Context to automatically change the ownership of the volume. However, this feature does not work in all Kubernetes distributions.
As an alternative, this chart supports using an initContainer to change the ownership of the volume before mounting it in the final destination.

You can enable this initContainer by setting `volumePermissions.enabled` to `true`.

## Upgrading

### To 11.8.0

External access to brokers can now be achived through the cluster's Kafka service.

- `service.nodePort` -> deprecated  in favor of `service.nodePorts.client` and `service.nodePorts.external`

### To 11.7.0

The way to configure the users and passwords changed. Now it is allowed to create multiple users during the installation by providing the list of users and passwords.

- `auth.jaas.clientUser` (string) -> deprecated  in favor of `auth.jaas.clientUsers` (array).
- `auth.jaas.clientPassword` (string) -> deprecated  in favor of `auth.jaas.clientPasswords` (array).

### To 11.0.0

The way to configure listeners and athentication on Kafka is totally refactored allowing users to configure different authentication protocols on different listeners. Please check the sections [Listeners Configuration](listeners-configuration) and [Listeners Configuration](enable-kafka-for-kafka-and-zookeeper) for more information.

Backwards compatibility is not guaranteed you adapt your values.yaml to the new format. Here you can find some parameters that were renamed or dissapeared in favor of new ones on this major version:

- `auth.enabled` -> deprecated in favor of `auth.clientProtocol` and `auth.interBrokerProtocol` parameters.
- `auth.ssl` -> deprecated in favor of `auth.clientProtocol` and `auth.interBrokerProtocol` parameters.
- `auth.certificatesSecret` -> renamed to `auth.jksSecret`.
- `auth.certificatesPassword` -> renamed to `auth.jksPassword`.
- `sslEndpointIdentificationAlgorithm` -> renamedo to `auth.tlsEndpointIdentificationAlgorithm`.
- `auth.interBrokerUser` -> renamed to `auth.jaas.interBrokerUser`
- `auth.interBrokerPassword` -> renamed to `auth.jaas.interBrokerPassword`
- `auth.zookeeperUser` -> renamed to `auth.jaas.zookeeperUser`
- `auth.zookeeperPassword` -> renamed to `auth.jaas.zookeeperPassword`
- `auth.existingSecret` -> renamed to `auth.jaas.existingSecret`
- `service.sslPort` -> deprecated in favor of `service.internalPort`
- `service.nodePorts.kafka` and `service.nodePorts.ssl` -> deprecated in favor of `service.nodePort`
- `metrics.kafka.extraFlag` -> new parameter
- `metrics.kafka.certificatesSecret` -> new parameter

### To 10.0.0

If you are setting the `config` or `log4j` parameter, backwards compatibility is not guaranteed, because the `KAFKA_MOUNTED_CONFDIR` has moved from `/opt/bitnami/kafka/conf` to `/bitnami/kafka/config`. In order to continue using these parameters, you must also upgrade your image to `docker.io/bitnami/kafka:2.4.1-debian-10-r38` or later.

### To 9.0.0

Backwards compatibility is not guaranteed you adapt your values.yaml to the new format. Here you can find some parameters that were renamed on this major version:

```diff
- securityContext.enabled
- securityContext.fsGroup
- securityContext.fsGroup
+ podSecurityContext
- externalAccess.service.loadBalancerIP
+ externalAccess.service.loadBalancerIPs
- externalAccess.service.nodePort
+ externalAccess.service.nodePorts
- metrics.jmx.configMap.enabled
- metrics.jmx.configMap.overrideConfig
+ metrics.jmx.config
- metrics.jmx.configMap.overrideName
+ metrics.jmx.existingConfigmap
```

Ports names were prefixed with the protocol to comply with Istio (see https://istio.io/docs/ops/deployment/requirements/).

### To 8.0.0

There is not backwards compatibility since the brokerID changes to the POD_NAME. For more information see [this PR](https://github.com/bitnami/charts/pull/2028).

### To 7.0.0

Backwards compatibility is not guaranteed when Kafka metrics are enabled, unless you modify the labels used on the exporter deployments.
Use the workaround below to upgrade from versions previous to 7.0.0. The following example assumes that the release name is kafka:

```console
helm upgrade kafka bitnami/kafka --version 6.1.8 --set metrics.kafka.enabled=false
helm upgrade kafka bitnami/kafka --version 7.0.0 --set metrics.kafka.enabled=true
```

### To 2.0.0

Backwards compatibility is not guaranteed unless you modify the labels used on the chart's deployments.
Use the workaround below to upgrade from versions previous to 2.0.0. The following example assumes that the release name is kafka:

```console
kubectl delete statefulset kafka-kafka --cascade=false
kubectl delete statefulset kafka-zookeeper --cascade=false
```

### To 1.0.0

Backwards compatibility is not guaranteed unless you modify the labels used on the chart's deployments.
Use the workaround below to upgrade from versions previous to 1.0.0. The following example assumes that the release name is kafka:

```console
kubectl delete statefulset kafka-kafka --cascade=false
kubectl delete statefulset kafka-zookeeper --cascade=false
```
