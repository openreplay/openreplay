<!--- app-name: Apache Kafka -->

# Apache Kafka packaged by Bitnami

Apache Kafka is a distributed streaming platform designed to build real-time pipelines and can be used as a message broker or as a replacement for a log aggregation solution for big data applications.

[Overview of Apache Kafka](http://kafka.apache.org/)

Trademarks: This software listing is packaged by Bitnami. The respective trademarks mentioned in the offering are owned by the respective companies, and use of them does not imply any affiliation or endorsement.
                           
## TL;DR

```console
helm repo add my-repo https://charts.bitnami.com/bitnami
helm install my-release my-repo/kafka
```

## Introduction

This chart bootstraps a [Kafka](https://github.com/bitnami/containers/tree/main/bitnami/kafka) deployment on a [Kubernetes](https://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.

Bitnami charts can be used with [Kubeapps](https://kubeapps.dev/) for deployment and management of Helm Charts in clusters.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure

## Installing the Chart

To install the chart with the release name `my-release`:

```console
helm repo add my-repo https://charts.bitnami.com/bitnami
helm install my-release my-repo/kafka
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

### Global parameters

| Name                      | Description                                     | Value |
| ------------------------- | ----------------------------------------------- | ----- |
| `global.imageRegistry`    | Global Docker image registry                    | `""`  |
| `global.imagePullSecrets` | Global Docker registry secret names as an array | `[]`  |
| `global.storageClass`     | Global StorageClass for Persistent Volume(s)    | `""`  |


### Common parameters

| Name                     | Description                                                                             | Value           |
| ------------------------ | --------------------------------------------------------------------------------------- | --------------- |
| `kubeVersion`            | Override Kubernetes version                                                             | `""`            |
| `nameOverride`           | String to partially override common.names.fullname                                      | `""`            |
| `fullnameOverride`       | String to fully override common.names.fullname                                          | `""`            |
| `clusterDomain`          | Default Kubernetes cluster domain                                                       | `cluster.local` |
| `commonLabels`           | Labels to add to all deployed objects                                                   | `{}`            |
| `commonAnnotations`      | Annotations to add to all deployed objects                                              | `{}`            |
| `extraDeploy`            | Array of extra objects to deploy with the release                                       | `[]`            |
| `diagnosticMode.enabled` | Enable diagnostic mode (all probes will be disabled and the command will be overridden) | `false`         |
| `diagnosticMode.command` | Command to override all containers in the statefulset                                   | `["sleep"]`     |
| `diagnosticMode.args`    | Args to override all containers in the statefulset                                      | `["infinity"]`  |


### Kafka parameters

| Name                                              | Description                                                                                                                                                                         | Value                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `image.registry`                                  | Kafka image registry                                                                                                                                                                | `docker.io`                         |
| `image.repository`                                | Kafka image repository                                                                                                                                                              | `bitnami/kafka`                     |
| `image.tag`                                       | Kafka image tag (immutable tags are recommended)                                                                                                                                    | `3.3.1-debian-11-r34`               |
| `image.digest`                                    | Kafka image digest in the way sha256:aa.... Please note this parameter, if set, will override the tag                                                                               | `""`                                |
| `image.pullPolicy`                                | Kafka image pull policy                                                                                                                                                             | `IfNotPresent`                      |
| `image.pullSecrets`                               | Specify docker-registry secret names as an array                                                                                                                                    | `[]`                                |
| `image.debug`                                     | Specify if debug values should be set                                                                                                                                               | `false`                             |
| `config`                                          | Configuration file for Kafka. Auto-generated based on other parameters when not specified                                                                                           | `""`                                |
| `existingConfigmap`                               | ConfigMap with Kafka Configuration                                                                                                                                                  | `""`                                |
| `log4j`                                           | An optional log4j.properties file to overwrite the default of the Kafka brokers                                                                                                     | `""`                                |
| `existingLog4jConfigMap`                          | The name of an existing ConfigMap containing a log4j.properties file                                                                                                                | `""`                                |
| `heapOpts`                                        | Kafka Java Heap size                                                                                                                                                                | `-Xmx1024m -Xms1024m`               |
| `deleteTopicEnable`                               | Switch to enable topic deletion or not                                                                                                                                              | `false`                             |
| `autoCreateTopicsEnable`                          | Switch to enable auto creation of topics. Enabling auto creation of topics not recommended for production or similar environments                                                   | `true`                              |
| `logFlushIntervalMessages`                        | The number of messages to accept before forcing a flush of data to disk                                                                                                             | `_10000`                            |
| `logFlushIntervalMs`                              | The maximum amount of time a message can sit in a log before we force a flush                                                                                                       | `1000`                              |
| `logRetentionBytes`                               | A size-based retention policy for logs                                                                                                                                              | `_1073741824`                       |
| `logRetentionCheckIntervalMs`                     | The interval at which log segments are checked to see if they can be deleted                                                                                                        | `300000`                            |
| `logRetentionHours`                               | The minimum age of a log file to be eligible for deletion due to age                                                                                                                | `168`                               |
| `logSegmentBytes`                                 | The maximum size of a log segment file. When this size is reached a new log segment will be created                                                                                 | `_1073741824`                       |
| `logsDirs`                                        | A comma separated list of directories in which kafka's log data is kept                                                                                                             | `/bitnami/kafka/data`               |
| `maxMessageBytes`                                 | The largest record batch size allowed by Kafka                                                                                                                                      | `_1000012`                          |
| `defaultReplicationFactor`                        | Default replication factors for automatically created topics                                                                                                                        | `1`                                 |
| `offsetsTopicReplicationFactor`                   | The replication factor for the offsets topic                                                                                                                                        | `1`                                 |
| `transactionStateLogReplicationFactor`            | The replication factor for the transaction topic                                                                                                                                    | `1`                                 |
| `transactionStateLogMinIsr`                       | Overridden min.insync.replicas config for the transaction topic                                                                                                                     | `1`                                 |
| `numIoThreads`                                    | The number of threads doing disk I/O                                                                                                                                                | `8`                                 |
| `numNetworkThreads`                               | The number of threads handling network requests                                                                                                                                     | `3`                                 |
| `numPartitions`                                   | The default number of log partitions per topic                                                                                                                                      | `1`                                 |
| `numRecoveryThreadsPerDataDir`                    | The number of threads per data directory to be used for log recovery at startup and flushing at shutdown                                                                            | `1`                                 |
| `socketReceiveBufferBytes`                        | The receive buffer (SO_RCVBUF) used by the socket server                                                                                                                            | `102400`                            |
| `socketRequestMaxBytes`                           | The maximum size of a request that the socket server will accept (protection against OOM)                                                                                           | `_104857600`                        |
| `socketSendBufferBytes`                           | The send buffer (SO_SNDBUF) used by the socket server                                                                                                                               | `102400`                            |
| `zookeeperConnectionTimeoutMs`                    | Timeout in ms for connecting to ZooKeeper                                                                                                                                           | `6000`                              |
| `zookeeperChrootPath`                             | Path which puts data under some path in the global ZooKeeper namespace                                                                                                              | `""`                                |
| `authorizerClassName`                             | The Authorizer is configured by setting authorizer.class.name=kafka.security.authorizer.AclAuthorizer in server.properties                                                          | `""`                                |
| `allowEveryoneIfNoAclFound`                       | By default, if a resource has no associated ACLs, then no one is allowed to access that resource except super users                                                                 | `true`                              |
| `superUsers`                                      | You can add super users in server.properties                                                                                                                                        | `User:admin`                        |
| `auth.clientProtocol`                             | Authentication protocol for communications with clients. Allowed protocols: `plaintext`, `tls`, `mtls`, `sasl` and `sasl_tls`                                                       | `plaintext`                         |
| `auth.externalClientProtocol`                     | Authentication protocol for communications with external clients. Defaults to value of `auth.clientProtocol`. Allowed protocols: `plaintext`, `tls`, `mtls`, `sasl` and `sasl_tls`  | `""`                                |
| `auth.interBrokerProtocol`                        | Authentication protocol for inter-broker communications. Allowed protocols: `plaintext`, `tls`, `mtls`, `sasl` and `sasl_tls`                                                       | `plaintext`                         |
| `auth.sasl.mechanisms`                            | SASL mechanisms when either `auth.interBrokerProtocol`, `auth.clientProtocol` or `auth.externalClientProtocol` are `sasl`. Allowed types: `plain`, `scram-sha-256`, `scram-sha-512` | `plain,scram-sha-256,scram-sha-512` |
| `auth.sasl.interBrokerMechanism`                  | SASL mechanism for inter broker communication.                                                                                                                                      | `plain`                             |
| `auth.sasl.jaas.clientUsers`                      | Kafka client user list                                                                                                                                                              | `["user"]`                          |
| `auth.sasl.jaas.clientPasswords`                  | Kafka client passwords. This is mandatory if more than one user is specified in clientUsers                                                                                         | `[]`                                |
| `auth.sasl.jaas.interBrokerUser`                  | Kafka inter broker communication user for SASL authentication                                                                                                                       | `admin`                             |
| `auth.sasl.jaas.interBrokerPassword`              | Kafka inter broker communication password for SASL authentication                                                                                                                   | `""`                                |
| `auth.sasl.jaas.zookeeperUser`                    | Kafka ZooKeeper user for SASL authentication                                                                                                                                        | `""`                                |
| `auth.sasl.jaas.zookeeperPassword`                | Kafka ZooKeeper password for SASL authentication                                                                                                                                    | `""`                                |
| `auth.sasl.jaas.existingSecret`                   | Name of the existing secret containing credentials for clientUsers, interBrokerUser and zookeeperUser                                                                               | `""`                                |
| `auth.tls.type`                                   | Format to use for TLS certificates. Allowed types: `jks` and `pem`                                                                                                                  | `jks`                               |
| `auth.tls.pemChainIncluded`                       | Flag to denote that the Certificate Authority (CA) certificates are bundled with the endpoint cert.                                                                                 | `false`                             |
| `auth.tls.existingSecrets`                        | Array existing secrets containing the TLS certificates for the Kafka brokers                                                                                                        | `[]`                                |
| `auth.tls.autoGenerated`                          | Generate automatically self-signed TLS certificates for Kafka brokers. Currently only supported if `auth.tls.type` is `pem`                                                         | `false`                             |
| `auth.tls.password`                               | Password to access the JKS files or PEM key when they are password-protected.                                                                                                       | `""`                                |
| `auth.tls.existingSecret`                         | Name of the secret containing the password to access the JKS files or PEM key when they are password-protected. (`key`: `password`)                                                 | `""`                                |
| `auth.tls.jksTruststoreSecret`                    | Name of the existing secret containing your truststore if truststore not existing or different from the ones in the `auth.tls.existingSecrets`                                      | `""`                                |
| `auth.tls.jksKeystoreSAN`                         | The secret key from the `auth.tls.existingSecrets` containing the keystore with a SAN certificate                                                                                   | `""`                                |
| `auth.tls.jksTruststore`                          | The secret key from the `auth.tls.existingSecrets` or `auth.tls.jksTruststoreSecret` containing the truststore                                                                      | `""`                                |
| `auth.tls.endpointIdentificationAlgorithm`        | The endpoint identification algorithm to validate server hostname using server certificate                                                                                          | `https`                             |
| `auth.zookeeper.tls.enabled`                      | Enable TLS for Zookeeper client connections.                                                                                                                                        | `false`                             |
| `auth.zookeeper.tls.type`                         | Format to use for TLS certificates. Allowed types: `jks` and `pem`.                                                                                                                 | `jks`                               |
| `auth.zookeeper.tls.verifyHostname`               | Hostname validation.                                                                                                                                                                | `true`                              |
| `auth.zookeeper.tls.existingSecret`               | Name of the existing secret containing the TLS certificates for ZooKeeper client communications.                                                                                    | `""`                                |
| `auth.zookeeper.tls.existingSecretKeystoreKey`    | The secret key from the  auth.zookeeper.tls.existingSecret containing the Keystore.                                                                                                 | `zookeeper.keystore.jks`            |
| `auth.zookeeper.tls.existingSecretTruststoreKey`  | The secret key from the auth.zookeeper.tls.existingSecret containing the Truststore.                                                                                                | `zookeeper.truststore.jks`          |
| `auth.zookeeper.tls.passwordsSecret`              | Existing secret containing Keystore and Truststore passwords.                                                                                                                       | `""`                                |
| `auth.zookeeper.tls.passwordsSecretKeystoreKey`   | The secret key from the auth.zookeeper.tls.passwordsSecret containing the password for the Keystore.                                                                                | `keystore-password`                 |
| `auth.zookeeper.tls.passwordsSecretTruststoreKey` | The secret key from the auth.zookeeper.tls.passwordsSecret containing the password for the Truststore.                                                                              | `truststore-password`               |
| `listeners`                                       | The address(es) the socket server listens on. Auto-calculated it's set to an empty array                                                                                            | `[]`                                |
| `advertisedListeners`                             | The address(es) (hostname:port) the broker will advertise to producers and consumers. Auto-calculated it's set to an empty array                                                    | `[]`                                |
| `listenerSecurityProtocolMap`                     | The protocol->listener mapping. Auto-calculated it's set to nil                                                                                                                     | `""`                                |
| `allowPlaintextListener`                          | Allow to use the PLAINTEXT listener                                                                                                                                                 | `true`                              |
| `interBrokerListenerName`                         | The listener that the brokers should communicate on                                                                                                                                 | `INTERNAL`                          |
| `command`                                         | Override Kafka container command                                                                                                                                                    | `["/scripts/setup.sh"]`             |
| `args`                                            | Override Kafka container arguments                                                                                                                                                  | `[]`                                |
| `extraEnvVars`                                    | Extra environment variables to add to Kafka pods                                                                                                                                    | `[]`                                |
| `extraEnvVarsCM`                                  | ConfigMap with extra environment variables                                                                                                                                          | `""`                                |
| `extraEnvVarsSecret`                              | Secret with extra environment variables                                                                                                                                             | `""`                                |


### Statefulset parameters

| Name                                                | Description                                                                                                                                                                                   | Value           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `replicaCount`                                      | Number of Kafka nodes                                                                                                                                                                         | `1`             |
| `minBrokerId`                                       | Minimal broker.id value, nodes increment their `broker.id` respectively                                                                                                                       | `0`             |
| `brokerRackAssignment`                              | Set Broker Assignment for multi tenant environment Allowed values: `aws-az`                                                                                                                   | `""`            |
| `containerPorts.client`                             | Kafka client container port                                                                                                                                                                   | `9092`          |
| `containerPorts.internal`                           | Kafka inter-broker container port                                                                                                                                                             | `9093`          |
| `containerPorts.external`                           | Kafka external container port                                                                                                                                                                 | `9094`          |
| `livenessProbe.enabled`                             | Enable livenessProbe on Kafka containers                                                                                                                                                      | `true`          |
| `livenessProbe.initialDelaySeconds`                 | Initial delay seconds for livenessProbe                                                                                                                                                       | `10`            |
| `livenessProbe.periodSeconds`                       | Period seconds for livenessProbe                                                                                                                                                              | `10`            |
| `livenessProbe.timeoutSeconds`                      | Timeout seconds for livenessProbe                                                                                                                                                             | `5`             |
| `livenessProbe.failureThreshold`                    | Failure threshold for livenessProbe                                                                                                                                                           | `3`             |
| `livenessProbe.successThreshold`                    | Success threshold for livenessProbe                                                                                                                                                           | `1`             |
| `readinessProbe.enabled`                            | Enable readinessProbe on Kafka containers                                                                                                                                                     | `true`          |
| `readinessProbe.initialDelaySeconds`                | Initial delay seconds for readinessProbe                                                                                                                                                      | `5`             |
| `readinessProbe.periodSeconds`                      | Period seconds for readinessProbe                                                                                                                                                             | `10`            |
| `readinessProbe.timeoutSeconds`                     | Timeout seconds for readinessProbe                                                                                                                                                            | `5`             |
| `readinessProbe.failureThreshold`                   | Failure threshold for readinessProbe                                                                                                                                                          | `6`             |
| `readinessProbe.successThreshold`                   | Success threshold for readinessProbe                                                                                                                                                          | `1`             |
| `startupProbe.enabled`                              | Enable startupProbe on Kafka containers                                                                                                                                                       | `false`         |
| `startupProbe.initialDelaySeconds`                  | Initial delay seconds for startupProbe                                                                                                                                                        | `30`            |
| `startupProbe.periodSeconds`                        | Period seconds for startupProbe                                                                                                                                                               | `10`            |
| `startupProbe.timeoutSeconds`                       | Timeout seconds for startupProbe                                                                                                                                                              | `1`             |
| `startupProbe.failureThreshold`                     | Failure threshold for startupProbe                                                                                                                                                            | `15`            |
| `startupProbe.successThreshold`                     | Success threshold for startupProbe                                                                                                                                                            | `1`             |
| `customLivenessProbe`                               | Custom livenessProbe that overrides the default one                                                                                                                                           | `{}`            |
| `customReadinessProbe`                              | Custom readinessProbe that overrides the default one                                                                                                                                          | `{}`            |
| `customStartupProbe`                                | Custom startupProbe that overrides the default one                                                                                                                                            | `{}`            |
| `lifecycleHooks`                                    | lifecycleHooks for the Kafka container to automate configuration before or after startup                                                                                                      | `{}`            |
| `resources.limits`                                  | The resources limits for the container                                                                                                                                                        | `{}`            |
| `resources.requests`                                | The requested resources for the container                                                                                                                                                     | `{}`            |
| `podSecurityContext.enabled`                        | Enable security context for the pods                                                                                                                                                          | `true`          |
| `podSecurityContext.fsGroup`                        | Set Kafka pod's Security Context fsGroup                                                                                                                                                      | `1001`          |
| `containerSecurityContext.enabled`                  | Enable Kafka containers' Security Context                                                                                                                                                     | `true`          |
| `containerSecurityContext.runAsUser`                | Set Kafka containers' Security Context runAsUser                                                                                                                                              | `1001`          |
| `containerSecurityContext.runAsNonRoot`             | Set Kafka containers' Security Context runAsNonRoot                                                                                                                                           | `true`          |
| `containerSecurityContext.allowPrivilegeEscalation` | Force the child process to be run as nonprivilege                                                                                                                                             | `false`         |
| `hostAliases`                                       | Kafka pods host aliases                                                                                                                                                                       | `[]`            |
| `hostNetwork`                                       | Specify if host network should be enabled for Kafka pods                                                                                                                                      | `false`         |
| `hostIPC`                                           | Specify if host IPC should be enabled for Kafka pods                                                                                                                                          | `false`         |
| `podLabels`                                         | Extra labels for Kafka pods                                                                                                                                                                   | `{}`            |
| `podAnnotations`                                    | Extra annotations for Kafka pods                                                                                                                                                              | `{}`            |
| `podAffinityPreset`                                 | Pod affinity preset. Ignored if `affinity` is set. Allowed values: `soft` or `hard`                                                                                                           | `""`            |
| `podAntiAffinityPreset`                             | Pod anti-affinity preset. Ignored if `affinity` is set. Allowed values: `soft` or `hard`                                                                                                      | `soft`          |
| `nodeAffinityPreset.type`                           | Node affinity preset type. Ignored if `affinity` is set. Allowed values: `soft` or `hard`                                                                                                     | `""`            |
| `nodeAffinityPreset.key`                            | Node label key to match Ignored if `affinity` is set.                                                                                                                                         | `""`            |
| `nodeAffinityPreset.values`                         | Node label values to match. Ignored if `affinity` is set.                                                                                                                                     | `[]`            |
| `affinity`                                          | Affinity for pod assignment                                                                                                                                                                   | `{}`            |
| `nodeSelector`                                      | Node labels for pod assignment                                                                                                                                                                | `{}`            |
| `tolerations`                                       | Tolerations for pod assignment                                                                                                                                                                | `[]`            |
| `topologySpreadConstraints`                         | Topology Spread Constraints for pod assignment spread across your cluster among failure-domains. Evaluated as a template                                                                      | `[]`            |
| `terminationGracePeriodSeconds`                     | Seconds the pod needs to gracefully terminate                                                                                                                                                 | `""`            |
| `podManagementPolicy`                               | StatefulSet controller supports relax its ordering guarantees while preserving its uniqueness and identity guarantees. There are two valid pod management policies: OrderedReady and Parallel | `Parallel`      |
| `priorityClassName`                                 | Name of the existing priority class to be used by kafka pods                                                                                                                                  | `""`            |
| `schedulerName`                                     | Name of the k8s scheduler (other than default)                                                                                                                                                | `""`            |
| `updateStrategy.type`                               | Kafka statefulset strategy type                                                                                                                                                               | `RollingUpdate` |
| `updateStrategy.rollingUpdate`                      | Kafka statefulset rolling update configuration parameters                                                                                                                                     | `{}`            |
| `extraVolumes`                                      | Optionally specify extra list of additional volumes for the Kafka pod(s)                                                                                                                      | `[]`            |
| `extraVolumeMounts`                                 | Optionally specify extra list of additional volumeMounts for the Kafka container(s)                                                                                                           | `[]`            |
| `sidecars`                                          | Add additional sidecar containers to the Kafka pod(s)                                                                                                                                         | `[]`            |
| `initContainers`                                    | Add additional Add init containers to the Kafka pod(s)                                                                                                                                        | `[]`            |
| `pdb.create`                                        | Deploy a pdb object for the Kafka pod                                                                                                                                                         | `false`         |
| `pdb.minAvailable`                                  | Maximum number/percentage of unavailable Kafka replicas                                                                                                                                       | `""`            |
| `pdb.maxUnavailable`                                | Maximum number/percentage of unavailable Kafka replicas                                                                                                                                       | `1`             |


### Traffic Exposure parameters

| Name                                              | Description                                                                                                              | Value                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `service.type`                                    | Kubernetes Service type                                                                                                  | `ClusterIP`            |
| `service.ports.client`                            | Kafka svc port for client connections                                                                                    | `9092`                 |
| `service.ports.internal`                          | Kafka svc port for inter-broker connections                                                                              | `9093`                 |
| `service.ports.external`                          | Kafka svc port for external connections                                                                                  | `9094`                 |
| `service.nodePorts.client`                        | Node port for the Kafka client connections                                                                               | `""`                   |
| `service.nodePorts.external`                      | Node port for the Kafka external connections                                                                             | `""`                   |
| `service.sessionAffinity`                         | Control where client requests go, to the same pod or round-robin                                                         | `None`                 |
| `service.sessionAffinityConfig`                   | Additional settings for the sessionAffinity                                                                              | `{}`                   |
| `service.clusterIP`                               | Kafka service Cluster IP                                                                                                 | `""`                   |
| `service.loadBalancerIP`                          | Kafka service Load Balancer IP                                                                                           | `""`                   |
| `service.loadBalancerSourceRanges`                | Kafka service Load Balancer sources                                                                                      | `[]`                   |
| `service.externalTrafficPolicy`                   | Kafka service external traffic policy                                                                                    | `Cluster`              |
| `service.annotations`                             | Additional custom annotations for Kafka service                                                                          | `{}`                   |
| `service.headless.publishNotReadyAddresses`       | Indicates that any agent which deals with endpoints for this Service should disregard any indications of ready/not-ready | `false`                |
| `service.headless.annotations`                    | Annotations for the headless service.                                                                                    | `{}`                   |
| `service.headless.labels`                         | Labels for the headless service.                                                                                         | `{}`                   |
| `service.extraPorts`                              | Extra ports to expose in the Kafka service (normally used with the `sidecar` value)                                      | `[]`                   |
| `externalAccess.enabled`                          | Enable Kubernetes external cluster access to Kafka brokers                                                               | `false`                |
| `externalAccess.autoDiscovery.enabled`            | Enable using an init container to auto-detect external IPs/ports by querying the K8s API                                 | `false`                |
| `externalAccess.autoDiscovery.image.registry`     | Init container auto-discovery image registry                                                                             | `docker.io`            |
| `externalAccess.autoDiscovery.image.repository`   | Init container auto-discovery image repository                                                                           | `bitnami/kubectl`      |
| `externalAccess.autoDiscovery.image.tag`          | Init container auto-discovery image tag (immutable tags are recommended)                                                 | `1.25.5-debian-11-r11` |
| `externalAccess.autoDiscovery.image.digest`       | Petete image digest in the way sha256:aa.... Please note this parameter, if set, will override the tag                   | `""`                   |
| `externalAccess.autoDiscovery.image.pullPolicy`   | Init container auto-discovery image pull policy                                                                          | `IfNotPresent`         |
| `externalAccess.autoDiscovery.image.pullSecrets`  | Init container auto-discovery image pull secrets                                                                         | `[]`                   |
| `externalAccess.autoDiscovery.resources.limits`   | The resources limits for the auto-discovery init container                                                               | `{}`                   |
| `externalAccess.autoDiscovery.resources.requests` | The requested resources for the auto-discovery init container                                                            | `{}`                   |
| `externalAccess.service.type`                     | Kubernetes Service type for external access. It can be NodePort, LoadBalancer or ClusterIP                               | `LoadBalancer`         |
| `externalAccess.service.ports.external`           | Kafka port used for external access when service type is LoadBalancer                                                    | `9094`                 |
| `externalAccess.service.loadBalancerIPs`          | Array of load balancer IPs for each Kafka broker. Length must be the same as replicaCount                                | `[]`                   |
| `externalAccess.service.loadBalancerNames`        | Array of load balancer Names for each Kafka broker. Length must be the same as replicaCount                              | `[]`                   |
| `externalAccess.service.loadBalancerAnnotations`  | Array of load balancer annotations for each Kafka broker. Length must be the same as replicaCount                        | `[]`                   |
| `externalAccess.service.loadBalancerSourceRanges` | Address(es) that are allowed when service is LoadBalancer                                                                | `[]`                   |
| `externalAccess.service.nodePorts`                | Array of node ports used for each Kafka broker. Length must be the same as replicaCount                                  | `[]`                   |
| `externalAccess.service.useHostIPs`               | Use service host IPs to configure Kafka external listener when service type is NodePort                                  | `false`                |
| `externalAccess.service.usePodIPs`                | using the MY_POD_IP address for external access.                                                                         | `false`                |
| `externalAccess.service.domain`                   | Domain or external ip used to configure Kafka external listener when service type is NodePort or ClusterIP               | `""`                   |
| `externalAccess.service.publishNotReadyAddresses` | Indicates that any agent which deals with endpoints for this Service should disregard any indications of ready/not-ready | `false`                |
| `externalAccess.service.labels`                   | Service labels for external access                                                                                       | `{}`                   |
| `externalAccess.service.annotations`              | Service annotations for external access                                                                                  | `{}`                   |
| `externalAccess.service.extraPorts`               | Extra ports to expose in the Kafka external service                                                                      | `[]`                   |
| `networkPolicy.enabled`                           | Specifies whether a NetworkPolicy should be created                                                                      | `false`                |
| `networkPolicy.allowExternal`                     | Don't require client label for connections                                                                               | `true`                 |
| `networkPolicy.explicitNamespacesSelector`        | A Kubernetes LabelSelector to explicitly select namespaces from which traffic could be allowed                           | `{}`                   |
| `networkPolicy.externalAccess.from`               | customize the from section for External Access on tcp-external port                                                      | `[]`                   |
| `networkPolicy.egressRules.customRules`           | Custom network policy rule                                                                                               | `{}`                   |


### Persistence parameters

| Name                           | Description                                                                                                                            | Value                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `persistence.enabled`          | Enable Kafka data persistence using PVC, note that ZooKeeper persistence is unaffected                                                 | `true`                    |
| `persistence.existingClaim`    | A manually managed Persistent Volume and Claim                                                                                         | `""`                      |
| `persistence.storageClass`     | PVC Storage Class for Kafka data volume                                                                                                | `""`                      |
| `persistence.accessModes`      | Persistent Volume Access Modes                                                                                                         | `["ReadWriteOnce"]`       |
| `persistence.size`             | PVC Storage Request for Kafka data volume                                                                                              | `8Gi`                     |
| `persistence.annotations`      | Annotations for the PVC                                                                                                                | `{}`                      |
| `persistence.labels`           | Labels for the PVC                                                                                                                     | `{}`                      |
| `persistence.selector`         | Selector to match an existing Persistent Volume for Kafka data PVC. If set, the PVC can't have a PV dynamically provisioned for it     | `{}`                      |
| `persistence.mountPath`        | Mount path of the Kafka data volume                                                                                                    | `/bitnami/kafka`          |
| `logPersistence.enabled`       | Enable Kafka logs persistence using PVC, note that ZooKeeper persistence is unaffected                                                 | `false`                   |
| `logPersistence.existingClaim` | A manually managed Persistent Volume and Claim                                                                                         | `""`                      |
| `logPersistence.storageClass`  | PVC Storage Class for Kafka logs volume                                                                                                | `""`                      |
| `logPersistence.accessModes`   | Persistent Volume Access Modes                                                                                                         | `["ReadWriteOnce"]`       |
| `logPersistence.size`          | PVC Storage Request for Kafka logs volume                                                                                              | `8Gi`                     |
| `logPersistence.annotations`   | Annotations for the PVC                                                                                                                | `{}`                      |
| `logPersistence.selector`      | Selector to match an existing Persistent Volume for Kafka log data PVC. If set, the PVC can't have a PV dynamically provisioned for it | `{}`                      |
| `logPersistence.mountPath`     | Mount path of the Kafka logs volume                                                                                                    | `/opt/bitnami/kafka/logs` |


### Volume Permissions parameters

| Name                                                   | Description                                                                                                                       | Value                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `volumePermissions.enabled`                            | Enable init container that changes the owner and group of the persistent volume                                                   | `false`                 |
| `volumePermissions.image.registry`                     | Init container volume-permissions image registry                                                                                  | `docker.io`             |
| `volumePermissions.image.repository`                   | Init container volume-permissions image repository                                                                                | `bitnami/bitnami-shell` |
| `volumePermissions.image.tag`                          | Init container volume-permissions image tag (immutable tags are recommended)                                                      | `11-debian-11-r71`      |
| `volumePermissions.image.digest`                       | Init container volume-permissions image digest in the way sha256:aa.... Please note this parameter, if set, will override the tag | `""`                    |
| `volumePermissions.image.pullPolicy`                   | Init container volume-permissions image pull policy                                                                               | `IfNotPresent`          |
| `volumePermissions.image.pullSecrets`                  | Init container volume-permissions image pull secrets                                                                              | `[]`                    |
| `volumePermissions.resources.limits`                   | Init container volume-permissions resource limits                                                                                 | `{}`                    |
| `volumePermissions.resources.requests`                 | Init container volume-permissions resource requests                                                                               | `{}`                    |
| `volumePermissions.containerSecurityContext.runAsUser` | User ID for the init container                                                                                                    | `0`                     |


### Other Parameters

| Name                                          | Description                                                                                    | Value   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------- |
| `serviceAccount.create`                       | Enable creation of ServiceAccount for Kafka pods                                               | `true`  |
| `serviceAccount.name`                         | The name of the service account to use. If not set and `create` is `true`, a name is generated | `""`    |
| `serviceAccount.automountServiceAccountToken` | Allows auto mount of ServiceAccountToken on the serviceAccount created                         | `true`  |
| `serviceAccount.annotations`                  | Additional custom annotations for the ServiceAccount                                           | `{}`    |
| `rbac.create`                                 | Whether to create & use RBAC resources or not                                                  | `false` |


### Metrics parameters

| Name                                                        | Description                                                                                                                      | Value                                                                                   |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `metrics.kafka.enabled`                                     | Whether or not to create a standalone Kafka exporter to expose Kafka metrics                                                     | `false`                                                                                 |
| `metrics.kafka.image.registry`                              | Kafka exporter image registry                                                                                                    | `docker.io`                                                                             |
| `metrics.kafka.image.repository`                            | Kafka exporter image repository                                                                                                  | `bitnami/kafka-exporter`                                                                |
| `metrics.kafka.image.tag`                                   | Kafka exporter image tag (immutable tags are recommended)                                                                        | `1.6.0-debian-11-r48`                                                                   |
| `metrics.kafka.image.digest`                                | Kafka exporter image digest in the way sha256:aa.... Please note this parameter, if set, will override the tag                   | `""`                                                                                    |
| `metrics.kafka.image.pullPolicy`                            | Kafka exporter image pull policy                                                                                                 | `IfNotPresent`                                                                          |
| `metrics.kafka.image.pullSecrets`                           | Specify docker-registry secret names as an array                                                                                 | `[]`                                                                                    |
| `metrics.kafka.certificatesSecret`                          | Name of the existing secret containing the optional certificate and key files                                                    | `""`                                                                                    |
| `metrics.kafka.tlsCert`                                     | The secret key from the certificatesSecret if 'client-cert' key different from the default (cert-file)                           | `cert-file`                                                                             |
| `metrics.kafka.tlsKey`                                      | The secret key from the certificatesSecret if 'client-key' key different from the default (key-file)                             | `key-file`                                                                              |
| `metrics.kafka.tlsCaSecret`                                 | Name of the existing secret containing the optional ca certificate for Kafka exporter client authentication                      | `""`                                                                                    |
| `metrics.kafka.tlsCaCert`                                   | The secret key from the certificatesSecret or tlsCaSecret if 'ca-cert' key different from the default (ca-file)                  | `ca-file`                                                                               |
| `metrics.kafka.extraFlags`                                  | Extra flags to be passed to Kafka exporter                                                                                       | `{}`                                                                                    |
| `metrics.kafka.command`                                     | Override Kafka exporter container command                                                                                        | `[]`                                                                                    |
| `metrics.kafka.args`                                        | Override Kafka exporter container arguments                                                                                      | `[]`                                                                                    |
| `metrics.kafka.containerPorts.metrics`                      | Kafka exporter metrics container port                                                                                            | `9308`                                                                                  |
| `metrics.kafka.resources.limits`                            | The resources limits for the container                                                                                           | `{}`                                                                                    |
| `metrics.kafka.resources.requests`                          | The requested resources for the container                                                                                        | `{}`                                                                                    |
| `metrics.kafka.podSecurityContext.enabled`                  | Enable security context for the pods                                                                                             | `true`                                                                                  |
| `metrics.kafka.podSecurityContext.fsGroup`                  | Set Kafka exporter pod's Security Context fsGroup                                                                                | `1001`                                                                                  |
| `metrics.kafka.containerSecurityContext.enabled`            | Enable Kafka exporter containers' Security Context                                                                               | `true`                                                                                  |
| `metrics.kafka.containerSecurityContext.runAsUser`          | Set Kafka exporter containers' Security Context runAsUser                                                                        | `1001`                                                                                  |
| `metrics.kafka.containerSecurityContext.runAsNonRoot`       | Set Kafka exporter containers' Security Context runAsNonRoot                                                                     | `true`                                                                                  |
| `metrics.kafka.hostAliases`                                 | Kafka exporter pods host aliases                                                                                                 | `[]`                                                                                    |
| `metrics.kafka.podLabels`                                   | Extra labels for Kafka exporter pods                                                                                             | `{}`                                                                                    |
| `metrics.kafka.podAnnotations`                              | Extra annotations for Kafka exporter pods                                                                                        | `{}`                                                                                    |
| `metrics.kafka.podAffinityPreset`                           | Pod affinity preset. Ignored if `metrics.kafka.affinity` is set. Allowed values: `soft` or `hard`                                | `""`                                                                                    |
| `metrics.kafka.podAntiAffinityPreset`                       | Pod anti-affinity preset. Ignored if `metrics.kafka.affinity` is set. Allowed values: `soft` or `hard`                           | `soft`                                                                                  |
| `metrics.kafka.nodeAffinityPreset.type`                     | Node affinity preset type. Ignored if `metrics.kafka.affinity` is set. Allowed values: `soft` or `hard`                          | `""`                                                                                    |
| `metrics.kafka.nodeAffinityPreset.key`                      | Node label key to match Ignored if `metrics.kafka.affinity` is set.                                                              | `""`                                                                                    |
| `metrics.kafka.nodeAffinityPreset.values`                   | Node label values to match. Ignored if `metrics.kafka.affinity` is set.                                                          | `[]`                                                                                    |
| `metrics.kafka.affinity`                                    | Affinity for pod assignment                                                                                                      | `{}`                                                                                    |
| `metrics.kafka.nodeSelector`                                | Node labels for pod assignment                                                                                                   | `{}`                                                                                    |
| `metrics.kafka.tolerations`                                 | Tolerations for pod assignment                                                                                                   | `[]`                                                                                    |
| `metrics.kafka.schedulerName`                               | Name of the k8s scheduler (other than default) for Kafka exporter                                                                | `""`                                                                                    |
| `metrics.kafka.priorityClassName`                           | Kafka exporter pods' priorityClassName                                                                                           | `""`                                                                                    |
| `metrics.kafka.topologySpreadConstraints`                   | Topology Spread Constraints for pod assignment                                                                                   | `[]`                                                                                    |
| `metrics.kafka.extraVolumes`                                | Optionally specify extra list of additional volumes for the Kafka exporter pod(s)                                                | `[]`                                                                                    |
| `metrics.kafka.extraVolumeMounts`                           | Optionally specify extra list of additional volumeMounts for the Kafka exporter container(s)                                     | `[]`                                                                                    |
| `metrics.kafka.sidecars`                                    | Add additional sidecar containers to the Kafka exporter pod(s)                                                                   | `[]`                                                                                    |
| `metrics.kafka.initContainers`                              | Add init containers to the Kafka exporter pods                                                                                   | `[]`                                                                                    |
| `metrics.kafka.service.ports.metrics`                       | Kafka exporter metrics service port                                                                                              | `9308`                                                                                  |
| `metrics.kafka.service.clusterIP`                           | Static clusterIP or None for headless services                                                                                   | `""`                                                                                    |
| `metrics.kafka.service.sessionAffinity`                     | Control where client requests go, to the same pod or round-robin                                                                 | `None`                                                                                  |
| `metrics.kafka.service.annotations`                         | Annotations for the Kafka exporter service                                                                                       | `{}`                                                                                    |
| `metrics.kafka.serviceAccount.create`                       | Enable creation of ServiceAccount for Kafka exporter pods                                                                        | `true`                                                                                  |
| `metrics.kafka.serviceAccount.name`                         | The name of the service account to use. If not set and `create` is `true`, a name is generated                                   | `""`                                                                                    |
| `metrics.kafka.serviceAccount.automountServiceAccountToken` | Allows auto mount of ServiceAccountToken on the serviceAccount created                                                           | `true`                                                                                  |
| `metrics.jmx.enabled`                                       | Whether or not to expose JMX metrics to Prometheus                                                                               | `false`                                                                                 |
| `metrics.jmx.image.registry`                                | JMX exporter image registry                                                                                                      | `docker.io`                                                                             |
| `metrics.jmx.image.repository`                              | JMX exporter image repository                                                                                                    | `bitnami/jmx-exporter`                                                                  |
| `metrics.jmx.image.tag`                                     | JMX exporter image tag (immutable tags are recommended)                                                                          | `0.17.2-debian-11-r37`                                                                  |
| `metrics.jmx.image.digest`                                  | JMX exporter image digest in the way sha256:aa.... Please note this parameter, if set, will override the tag                     | `""`                                                                                    |
| `metrics.jmx.image.pullPolicy`                              | JMX exporter image pull policy                                                                                                   | `IfNotPresent`                                                                          |
| `metrics.jmx.image.pullSecrets`                             | Specify docker-registry secret names as an array                                                                                 | `[]`                                                                                    |
| `metrics.jmx.containerSecurityContext.enabled`              | Enable Prometheus JMX exporter containers' Security Context                                                                      | `true`                                                                                  |
| `metrics.jmx.containerSecurityContext.runAsUser`            | Set Prometheus JMX exporter containers' Security Context runAsUser                                                               | `1001`                                                                                  |
| `metrics.jmx.containerSecurityContext.runAsNonRoot`         | Set Prometheus JMX exporter containers' Security Context runAsNonRoot                                                            | `true`                                                                                  |
| `metrics.jmx.containerPorts.metrics`                        | Prometheus JMX exporter metrics container port                                                                                   | `5556`                                                                                  |
| `metrics.jmx.resources.limits`                              | The resources limits for the JMX exporter container                                                                              | `{}`                                                                                    |
| `metrics.jmx.resources.requests`                            | The requested resources for the JMX exporter container                                                                           | `{}`                                                                                    |
| `metrics.jmx.service.ports.metrics`                         | Prometheus JMX exporter metrics service port                                                                                     | `5556`                                                                                  |
| `metrics.jmx.service.clusterIP`                             | Static clusterIP or None for headless services                                                                                   | `""`                                                                                    |
| `metrics.jmx.service.sessionAffinity`                       | Control where client requests go, to the same pod or round-robin                                                                 | `None`                                                                                  |
| `metrics.jmx.service.annotations`                           | Annotations for the Prometheus JMX exporter service                                                                              | `{}`                                                                                    |
| `metrics.jmx.whitelistObjectNames`                          | Allows setting which JMX objects you want to expose to via JMX stats to JMX exporter                                             | `["kafka.controller:*","kafka.server:*","java.lang:*","kafka.network:*","kafka.log:*"]` |
| `metrics.jmx.config`                                        | Configuration file for JMX exporter                                                                                              | `""`                                                                                    |
| `metrics.jmx.existingConfigmap`                             | Name of existing ConfigMap with JMX exporter configuration                                                                       | `""`                                                                                    |
| `metrics.jmx.extraRules`                                    | Add extra rules to JMX exporter configuration                                                                                    | `""`                                                                                    |
| `metrics.serviceMonitor.enabled`                            | if `true`, creates a Prometheus Operator ServiceMonitor (requires `metrics.kafka.enabled` or `metrics.jmx.enabled` to be `true`) | `false`                                                                                 |
| `metrics.serviceMonitor.namespace`                          | Namespace in which Prometheus is running                                                                                         | `""`                                                                                    |
| `metrics.serviceMonitor.interval`                           | Interval at which metrics should be scraped                                                                                      | `""`                                                                                    |
| `metrics.serviceMonitor.scrapeTimeout`                      | Timeout after which the scrape is ended                                                                                          | `""`                                                                                    |
| `metrics.serviceMonitor.labels`                             | Additional labels that can be used so ServiceMonitor will be discovered by Prometheus                                            | `{}`                                                                                    |
| `metrics.serviceMonitor.selector`                           | Prometheus instance selector labels                                                                                              | `{}`                                                                                    |
| `metrics.serviceMonitor.relabelings`                        | RelabelConfigs to apply to samples before scraping                                                                               | `[]`                                                                                    |
| `metrics.serviceMonitor.metricRelabelings`                  | MetricRelabelConfigs to apply to samples before ingestion                                                                        | `[]`                                                                                    |
| `metrics.serviceMonitor.honorLabels`                        | Specify honorLabels parameter to add the scrape endpoint                                                                         | `false`                                                                                 |
| `metrics.serviceMonitor.jobLabel`                           | The name of the label on the target service to use as the job name in prometheus.                                                | `""`                                                                                    |
| `metrics.prometheusRule.enabled`                            | if `true`, creates a Prometheus Operator PrometheusRule (requires `metrics.kafka.enabled` or `metrics.jmx.enabled` to be `true`) | `false`                                                                                 |
| `metrics.prometheusRule.namespace`                          | Namespace in which Prometheus is running                                                                                         | `""`                                                                                    |
| `metrics.prometheusRule.labels`                             | Additional labels that can be used so PrometheusRule will be discovered by Prometheus                                            | `{}`                                                                                    |
| `metrics.prometheusRule.groups`                             | Prometheus Rule Groups for Kafka                                                                                                 | `[]`                                                                                    |


### Kafka provisioning parameters

| Name                                                       | Description                                                                                                                   | Value                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `provisioning.enabled`                                     | Enable kafka provisioning Job                                                                                                 | `false`               |
| `provisioning.numPartitions`                               | Default number of partitions for topics when unspecified                                                                      | `1`                   |
| `provisioning.replicationFactor`                           | Default replication factor for topics when unspecified                                                                        | `1`                   |
| `provisioning.topics`                                      | Kafka topics to provision                                                                                                     | `[]`                  |
| `provisioning.nodeSelector`                                | Node labels for pod assignment                                                                                                | `{}`                  |
| `provisioning.tolerations`                                 | Tolerations for pod assignment                                                                                                | `[]`                  |
| `provisioning.extraProvisioningCommands`                   | Extra commands to run to provision cluster resources                                                                          | `[]`                  |
| `provisioning.parallel`                                    | Number of provisioning commands to run at the same time                                                                       | `1`                   |
| `provisioning.preScript`                                   | Extra bash script to run before topic provisioning. $CLIENT_CONF is path to properties file with most needed configurations   | `""`                  |
| `provisioning.postScript`                                  | Extra bash script to run after topic provisioning. $CLIENT_CONF is path to properties file with most needed configurations    | `""`                  |
| `provisioning.auth.tls.type`                               | Format to use for TLS certificates. Allowed types: `jks` and `pem`.                                                           | `jks`                 |
| `provisioning.auth.tls.certificatesSecret`                 | Existing secret containing the TLS certificates for the Kafka provisioning Job.                                               | `""`                  |
| `provisioning.auth.tls.cert`                               | The secret key from the certificatesSecret if 'cert' key different from the default (tls.crt)                                 | `tls.crt`             |
| `provisioning.auth.tls.key`                                | The secret key from the certificatesSecret if 'key' key different from the default (tls.key)                                  | `tls.key`             |
| `provisioning.auth.tls.caCert`                             | The secret key from the certificatesSecret if 'caCert' key different from the default (ca.crt)                                | `ca.crt`              |
| `provisioning.auth.tls.keystore`                           | The secret key from the certificatesSecret if 'keystore' key different from the default (keystore.jks)                        | `keystore.jks`        |
| `provisioning.auth.tls.truststore`                         | The secret key from the certificatesSecret if 'truststore' key different from the default (truststore.jks)                    | `truststore.jks`      |
| `provisioning.auth.tls.passwordsSecret`                    | Name of the secret containing passwords to access the JKS files or PEM key when they are password-protected.                  | `""`                  |
| `provisioning.auth.tls.keyPasswordSecretKey`               | The secret key from the passwordsSecret if 'keyPasswordSecretKey' key different from the default (key-password)               | `key-password`        |
| `provisioning.auth.tls.keystorePasswordSecretKey`          | The secret key from the passwordsSecret if 'keystorePasswordSecretKey' key different from the default (keystore-password)     | `keystore-password`   |
| `provisioning.auth.tls.truststorePasswordSecretKey`        | The secret key from the passwordsSecret if 'truststorePasswordSecretKey' key different from the default (truststore-password) | `truststore-password` |
| `provisioning.auth.tls.keyPassword`                        | Password to access the password-protected PEM key if necessary. Ignored if 'passwordsSecret' is provided.                     | `""`                  |
| `provisioning.auth.tls.keystorePassword`                   | Password to access the JKS keystore. Ignored if 'passwordsSecret' is provided.                                                | `""`                  |
| `provisioning.auth.tls.truststorePassword`                 | Password to access the JKS truststore. Ignored if 'passwordsSecret' is provided.                                              | `""`                  |
| `provisioning.command`                                     | Override provisioning container command                                                                                       | `[]`                  |
| `provisioning.args`                                        | Override provisioning container arguments                                                                                     | `[]`                  |
| `provisioning.extraEnvVars`                                | Extra environment variables to add to the provisioning pod                                                                    | `[]`                  |
| `provisioning.extraEnvVarsCM`                              | ConfigMap with extra environment variables                                                                                    | `""`                  |
| `provisioning.extraEnvVarsSecret`                          | Secret with extra environment variables                                                                                       | `""`                  |
| `provisioning.podAnnotations`                              | Extra annotations for Kafka provisioning pods                                                                                 | `{}`                  |
| `provisioning.podLabels`                                   | Extra labels for Kafka provisioning pods                                                                                      | `{}`                  |
| `provisioning.serviceAccount.create`                       | Enable creation of ServiceAccount for Kafka provisioning pods                                                                 | `false`               |
| `provisioning.serviceAccount.name`                         | The name of the service account to use. If not set and `create` is `true`, a name is generated                                | `""`                  |
| `provisioning.serviceAccount.automountServiceAccountToken` | Allows auto mount of ServiceAccountToken on the serviceAccount created                                                        | `true`                |
| `provisioning.resources.limits`                            | The resources limits for the Kafka provisioning container                                                                     | `{}`                  |
| `provisioning.resources.requests`                          | The requested resources for the Kafka provisioning container                                                                  | `{}`                  |
| `provisioning.podSecurityContext.enabled`                  | Enable security context for the pods                                                                                          | `true`                |
| `provisioning.podSecurityContext.fsGroup`                  | Set Kafka provisioning pod's Security Context fsGroup                                                                         | `1001`                |
| `provisioning.containerSecurityContext.enabled`            | Enable Kafka provisioning containers' Security Context                                                                        | `true`                |
| `provisioning.containerSecurityContext.runAsUser`          | Set Kafka provisioning containers' Security Context runAsUser                                                                 | `1001`                |
| `provisioning.containerSecurityContext.runAsNonRoot`       | Set Kafka provisioning containers' Security Context runAsNonRoot                                                              | `true`                |
| `provisioning.schedulerName`                               | Name of the k8s scheduler (other than default) for kafka provisioning                                                         | `""`                  |
| `provisioning.extraVolumes`                                | Optionally specify extra list of additional volumes for the Kafka provisioning pod(s)                                         | `[]`                  |
| `provisioning.extraVolumeMounts`                           | Optionally specify extra list of additional volumeMounts for the Kafka provisioning container(s)                              | `[]`                  |
| `provisioning.sidecars`                                    | Add additional sidecar containers to the Kafka provisioning pod(s)                                                            | `[]`                  |
| `provisioning.initContainers`                              | Add additional Add init containers to the Kafka provisioning pod(s)                                                           | `[]`                  |
| `provisioning.waitForKafka`                                | If true use an init container to wait until kafka is ready before starting provisioning                                       | `true`                |


### ZooKeeper chart parameters

| Name                                    | Description                                                                                                                                                             | Value               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `zookeeper.enabled`                     | Switch to enable or disable the ZooKeeper helm chart                                                                                                                    | `true`              |
| `zookeeper.replicaCount`                | Number of ZooKeeper nodes                                                                                                                                               | `1`                 |
| `zookeeper.auth.client.enabled`         | Enable ZooKeeper auth                                                                                                                                                   | `false`             |
| `zookeeper.auth.client.clientUser`      | User that will use ZooKeeper clients to auth                                                                                                                            | `""`                |
| `zookeeper.auth.client.clientPassword`  | Password that will use ZooKeeper clients to auth                                                                                                                        | `""`                |
| `zookeeper.auth.client.serverUsers`     | Comma, semicolon or whitespace separated list of user to be created. Specify them as a string, for example: "user1,user2,admin"                                         | `""`                |
| `zookeeper.auth.client.serverPasswords` | Comma, semicolon or whitespace separated list of passwords to assign to users when created. Specify them as a string, for example: "pass4user1, pass4user2, pass4admin" | `""`                |
| `zookeeper.persistence.enabled`         | Enable persistence on ZooKeeper using PVC(s)                                                                                                                            | `true`              |
| `zookeeper.persistence.storageClass`    | Persistent Volume storage class                                                                                                                                         | `""`                |
| `zookeeper.persistence.accessModes`     | Persistent Volume access modes                                                                                                                                          | `["ReadWriteOnce"]` |
| `zookeeper.persistence.size`            | Persistent Volume size                                                                                                                                                  | `8Gi`               |
| `externalZookeeper.servers`             | List of external zookeeper servers to use. Typically used in combination with 'zookeeperChrootPath'.                                                                    | `[]`                |


Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example,

```console
helm install my-release \
  --set replicaCount=3 \
  my-repo/kafka
```

The above command deploys Kafka with 3 brokers (replicas).

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```console
helm install my-release -f values.yaml my-repo/kafka
```

> **Tip**: You can use the default [values.yaml](values.yaml)

## Configuration and installation details

### [Rolling VS Immutable tags](https://docs.bitnami.com/containers/how-to/understand-rolling-tags-containers/)

It is strongly recommended to use immutable tags in a production environment. This ensures your deployment does not change automatically if the same tag is updated with a different image.

Bitnami will release a new chart updating its containers if a new version of the main container, significant changes, or critical vulnerabilities exist.

### Setting custom parameters

Any environment variable beginning with `KAFKA_CFG_` will be mapped to its corresponding Kafka key. For example, use `KAFKA_CFG_BACKGROUND_THREADS` in order to set `background.threads`. In order to pass custom environment variables use the `extraEnvVars` property.

Using `extraEnvVars` with `KAFKA_CFG_` is the preferred and simplest way to add custom Kafka parameters not otherwise specified in this chart. Alternatively, you can provide a *full* Kafka configuration using `config` or `existingConfigmap`.
Setting either `config` or `existingConfigmap` will cause the chart to disregard `KAFKA_CFG_` settings, which are used by many other Kafka-related chart values described above, as well as dynamically generated parameters such as `zookeeper.connect`. This can cause unexpected behavior.

### Listeners configuration

This chart allows you to automatically configure Kafka with 3 listeners:

- One for inter-broker communications.
- A second one for communications with clients within the K8s cluster.
- (optional) a third listener for communications with clients outside the K8s cluster. Check [this section](#accessing-kafka-brokers-from-outside-the-cluster) for more information.

For more complex configurations, set the `listeners`, `advertisedListeners` and `listenerSecurityProtocolMap` parameters as needed.

### Enable security for Kafka and Zookeeper

You can configure different authentication protocols for each listener you configure in Kafka. For instance, you can use `sasl_tls` authentication for client communications, while using `tls` for inter-broker communications. This table shows the available protocols and the security they provide:

| Method    | Authentication               | Encryption via TLS |
|-----------|------------------------------|--------------------|
| plaintext | None                         | No                 |
| tls       | None                         | Yes                |
| mtls      | Yes (two-way authentication) | Yes                |
| sasl      | Yes (via SASL)               | No                 |
| sasl_tls  | Yes (via SASL)               | Yes                |

Learn more about how to configure Kafka to use the different authentication protocols in the [chart documentation](https://docs.bitnami.com/kubernetes/infrastructure/kafka/administration/enable-security/).

If you enabled SASL authentication on any listener, you can set the SASL credentials using the parameters below:

- `auth.sasl.jaas.clientUsers`/`auth.sasl.jaas.clientPasswords`: when enabling SASL authentication for communications with clients.
- `auth.sasl.jaas.interBrokerUser`/`auth.sasl.jaas.interBrokerPassword`:  when enabling SASL authentication for inter-broker communications.
- `auth.jaas.zookeeperUser`/`auth.jaas.zookeeperPassword`: In the case that the Zookeeper chart is deployed with SASL authentication enabled.

In order to configure TLS authentication/encryption, you **can** create a secret per Kafka broker you have in the cluster containing the Java Key Stores (JKS) files: the truststore (`kafka.truststore.jks`) and the keystore (`kafka.keystore.jks`). Then, you need pass the secret names with the `auth.tls.existingSecrets` parameter when deploying the chart.

> **Note**: If the JKS files are password protected (recommended), you will need to provide the password to get access to the keystores. To do so, use the `auth.tls.password` parameter to provide your password.

For instance, to configure TLS authentication on a Kafka cluster with 2 Kafka brokers use the commands below to create the secrets:

```console
kubectl create secret generic kafka-jks-0 --from-file=kafka.truststore.jks=./kafka.truststore.jks --from-file=kafka.keystore.jks=./kafka-0.keystore.jks
kubectl create secret generic kafka-jks-1 --from-file=kafka.truststore.jks=./kafka.truststore.jks --from-file=kafka.keystore.jks=./kafka-1.keystore.jks
```

> **Note**: the command above assumes you already created the truststore and keystores files. This [script](https://raw.githubusercontent.com/confluentinc/confluent-platform-security-tools/master/kafka-generate-ssl.sh) can help you with the JKS files generation.

If, for some reason (like using Cert-Manager) you can not use the default JKS secret scheme, you can use the additional parameters:

- `auth.tls.jksTruststoreSecret` to define additional secret, where the `kafka.truststore.jks` is being kept. The truststore password **must** be the same as in `auth.tls.password`
- `auth.tls.jksTruststore` to overwrite the default value of the truststore key (`kafka.truststore.jks`).
- `auth.tls.jksKeystoreSAN` if you want to use a SAN certificate for your brokers. Setting this parameter would mean that the chart expects a existing key in the `auth.tls.jksTruststoreSecret` with the `auth.tls.jksKeystoreSAN` value and use this as a keystore for **all** brokers
> **Note**: If you are using cert-manager, particularly when an ACME issuer is used, the `ca.crt` field is not put in the `Secret` that cert-manager creates. To handle this, the `auth.tls.pemChainIncluded` property can be set to `true` and the initContainer created by this Chart will attempt to extract the intermediate certs from the `tls.crt` field of the secret (which is a PEM chain)

> **Note**: The truststore/keystore from above **must** be protected with the same password as in `auth.tls.password`

You can deploy the chart with authentication using the following parameters:

```console
replicaCount=2
auth.clientProtocol=sasl
auth.interBrokerProtocol=tls
auth.tls.existingSecrets[0]=kafka-jks-0
auth.tls.existingSecrets[1]=kafka-jks-1
auth.tls.password=jksPassword
auth.sasl.jaas.clientUsers[0]=brokerUser
auth.sasl.jaas.clientPasswords[0]=brokerPassword
auth.sasl.jaas.zookeeperUser=zookeeperUser
auth.sasl.jaas.zookeeperPassword=zookeeperPassword
zookeeper.auth.enabled=true
zookeeper.auth.serverUsers=zookeeperUser
zookeeper.auth.serverPasswords=zookeeperPassword
zookeeper.auth.clientUser=zookeeperUser
zookeeper.auth.clientPassword=zookeeperPassword
```

You can deploy the chart with AclAuthorizer using the following parameters:

```console
replicaCount=2
auth.clientProtocol=sasl
auth.interBrokerProtocol=sasl_tls
auth.tls.existingSecrets[0]=kafka-jks-0
auth.tls.existingSecrets[1]=kafka-jks-1
auth.tls.password=jksPassword
auth.sasl.jaas.clientUsers[0]=brokerUser
auth.sasl.jaas.clientPasswords[0]=brokerPassword
auth.sasl.jaas.zookeeperUser=zookeeperUser
auth.sasl.jaas.zookeeperPassword=zookeeperPassword
zookeeper.auth.enabled=true
zookeeper.auth.serverUsers=zookeeperUser
zookeeper.auth.serverPasswords=zookeeperPassword
zookeeper.auth.clientUser=zookeeperUser
zookeeper.auth.clientPassword=zookeeperPassword
authorizerClassName=kafka.security.authorizer.AclAuthorizer
allowEveryoneIfNoAclFound=false
superUsers=User:admin
```

If you are using Kafka ACLs, you might encounter in kafka-authorizer.log the following event: `[...] Principal = User:ANONYMOUS is Allowed Operation [...]`.

By setting the following parameter: `auth.clientProtocol=mtls`, it will set the configuration in Kafka to `ssl.client.auth=required`. This option will require the clients to authenticate to Kafka brokers.

As result, we will be able to see in kafka-authorizer.log the events specific Subject: `[...] Principal = User:CN=kafka,OU=...,O=...,L=...,C=..,ST=... is [...]`.

If you also enable exposing metrics using the Kafka exporter, and you are using `sasl_tls`, `tls`, or `mtls` authentication protocols, you need to mount the CA certificated used to sign the brokers certificates in the exporter so it can validate the Kafka brokers. To do so, create a secret containing the CA, and set the `metrics.certificatesSecret` parameter. As an alternative, you can skip TLS validation using extra flags:

```console
metrics.kafka.extraFlags={tls.insecure-skip-tls-verify: ""}
```

### Accessing Kafka brokers from outside the cluster

In order to access Kafka Brokers from outside the cluster, an additional listener and advertised listener must be configured. Additionally, a specific service per kafka pod will be created.

There are three ways of configuring external access. Using LoadBalancer services, using NodePort services or using ClusterIP services.

#### Using LoadBalancer services

You have two alternatives to use LoadBalancer services:

- Option A) Use random load balancer IPs using an **initContainer** that waits for the IPs to be ready and discover them automatically.

```console
externalAccess.enabled=true
externalAccess.service.type=LoadBalancer
externalAccess.service.ports.external=9094
externalAccess.autoDiscovery.enabled=true
serviceAccount.create=true
rbac.create=true
```

Note: This option requires creating RBAC rules on clusters where RBAC policies are enabled.

- Option B) Manually specify the load balancer IPs:

```console
externalAccess.enabled=true
externalAccess.service.type=LoadBalancer
externalAccess.service.ports.external=9094
externalAccess.service.loadBalancerIPs[0]='external-ip-1'
externalAccess.service.loadBalancerIPs[1]='external-ip-2'}
```

Note: You need to know in advance the load balancer IPs so each Kafka broker advertised listener is configured with it.

Following the aforementioned steps will also allow to connect the brokers from the outside using the cluster's default service (when `service.type` is `LoadBalancer` or `NodePort`). Use the property `service.externalPort` to specify the port used for external connections.

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
externalAccess.service.nodePorts[0]='node-port-1'
externalAccess.service.nodePorts[1]='node-port-2'
```

Note: You need to know in advance the node ports that will be exposed so each Kafka broker advertised listener is configured with it.

The pod will try to get the external ip of the node using `curl -s https://ipinfo.io/ip` unless `externalAccess.service.domain` or `externalAccess.service.useHostIPs` is provided.

#### Using ClusterIP services

Note: This option requires that an ingress is deployed within your cluster

```console
externalAccess.enabled=true
externalAccess.service.type=ClusterIP
externalAccess.service.ports.external=9094
externalAccess.service.domain='ingress-ip'
```

Note: the deployed ingress must contain the following block:

```console
tcp:
  9094: "{{ .Release.Namespace }}/{{ include "kafka.fullname" . }}-0-external:9094"
  9095: "{{ .Release.Namespace }}/{{ include "kafka.fullname" . }}-1-external:9094"
  9096: "{{ .Release.Namespace }}/{{ include "kafka.fullname" . }}-2-external:9094"
```

#### Name resolution with External-DNS

You can use the following values to generate External-DNS annotations which automatically creates DNS records for each ReplicaSet pod:

```yaml
externalAccess:
  service:
    annotations:
      external-dns.alpha.kubernetes.io/hostname: "{{ .targetPod }}.example.com"
```

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

### Setting Pod's affinity

This chart allows you to set your custom affinity using the `affinity` parameter. Find more information about Pod's affinity in the [kubernetes documentation](https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity).

As an alternative, you can use of the preset configurations for pod affinity, pod anti-affinity, and node affinity available at the [bitnami/common](https://github.com/bitnami/charts/tree/main/bitnami/common#affinities) chart. To do so, set the `podAffinityPreset`, `podAntiAffinityPreset`, or `nodeAffinityPreset` parameters.

### Deploying extra resources

There are cases where you may want to deploy extra objects, such as Kafka Connect. For covering this case, the chart allows adding the full specification of other objects using the `extraDeploy` parameter. The following example would create a deployment including a Kafka Connect deployment so you can connect Kafka with MongoDB&reg;:

```yaml
## Extra objects to deploy (value evaluated as a template)
##
extraDeploy:
  - |
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: {{ include "kafka.fullname" . }}-connect
      labels: {{- include "common.labels.standard" . | nindent 4 }}
        app.kubernetes.io/component: connector
    spec:
      replicas: 1
      selector:
        matchLabels: {{- include "common.labels.matchLabels" . | nindent 6 }}
          app.kubernetes.io/component: connector
      template:
        metadata:
          labels: {{- include "common.labels.standard" . | nindent 8 }}
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
                  mountPath: /bitnami/kafka/config
          volumes:
            - name: configuration
              configMap:
                name: {{ include "kafka.fullname" . }}-connect
  - |
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: {{ include "kafka.fullname" . }}-connect
      labels: {{- include "common.labels.standard" . | nindent 4 }}
        app.kubernetes.io/component: connector
    data:
      connect-standalone.properties: |-
        bootstrap.servers = {{ include "kafka.fullname" . }}-0.{{ include "kafka.fullname" . }}-headless.{{ .Release.Namespace }}.svc.{{ .Values.clusterDomain }}:{{ .Values.service.port }}
        ...
      mongodb.properties: |-
        connection.uri=mongodb://root:password@mongodb-hostname:27017
        ...
  - |
    apiVersion: v1
    kind: Service
    metadata:
      name: {{ include "kafka.fullname" . }}-connect
      labels: {{- include "common.labels.standard" . | nindent 4 }}
        app.kubernetes.io/component: connector
    spec:
      ports:
        - protocol: TCP
          port: 8083
          targetPort: connector
      selector: {{- include "common.labels.matchLabels" . | nindent 4 }}
        app.kubernetes.io/component: connector
```

You can create the Kafka Connect image using the Dockerfile below:

```Dockerfile
FROM bitnami/kafka:latest
# Download MongoDB&reg; Connector for Apache Kafka https://www.confluent.io/hub/mongodb/kafka-connect-mongodb
RUN mkdir -p /opt/bitnami/kafka/plugins && \
    cd /opt/bitnami/kafka/plugins && \
    curl --remote-name --location --silent https://search.maven.org/remotecontent?filepath=org/mongodb/kafka/mongo-kafka-connect/1.2.0/mongo-kafka-connect-1.2.0-all.jar
CMD /opt/bitnami/kafka/bin/connect-standalone.sh /opt/bitnami/kafka/config/connect-standalone.properties /opt/bitnami/kafka/config/mongo.properties
```

## Persistence

The [Bitnami Kafka](https://github.com/bitnami/containers/tree/main/bitnami/kafka) image stores the Kafka data at the `/bitnami/kafka` path of the container.

Persistent Volume Claims are used to keep the data across deployments. This is known to work in GCE, AWS, and minikube. See the [Parameters](#persistence-parameters) section to configure the PVC or to disable persistence.

### Adjust permissions of persistent volume mountpoint

As the image run as non-root by default, it is necessary to adjust the ownership of the persistent volume so that the container can write data into it.

By default, the chart is configured to use Kubernetes Security Context to automatically change the ownership of the volume. However, this feature does not work in all Kubernetes distributions.
As an alternative, this chart supports using an initContainer to change the ownership of the volume before mounting it in the final destination.

You can enable this initContainer by setting `volumePermissions.enabled` to `true`.

## Troubleshooting

Find more information about how to deal with common errors related to Bitnami's Helm charts in [this troubleshooting guide](https://docs.bitnami.com/general/how-to/troubleshoot-helm-chart-issues).

## Upgrading

### To 20.0.0

This major updates the Zookeeper subchart to it newest major, 11.0.0. For more information on this subchart's major, please refer to [zookeeper upgrade notes](https://github.com/bitnami/charts/tree/main/bitnami/zookeeper#to-1100).

### To 19.0.0

This major updates Kafka to its newest version, 3.3.x. For more information, please refer to [kafka upgrade notes](https://kafka.apache.org/33/documentation.html#upgrade).

### To 18.0.0

This major updates the Zookeeper subchart to it newest major, 10.0.0. For more information on this subchart's major, please refer to [zookeeper upgrade notes](https://github.com/bitnami/charts/tree/main/bitnami/zookeeper#to-1000).

### To 16.0.0

This major updates the Zookeeper subchart to it newest major, 9.0.0. For more information on this subchart's major, please refer to [zookeeper upgrade notes](https://github.com/bitnami/charts/tree/main/bitnami/zookeeper#to-900).

### To 15.0.0

This major release bumps Kafka major version to `3.x` series.
It also renames several values in this chart and adds missing features, in order to be inline with the rest of assets in the Bitnami charts repository. Some affected values are:

- `service.port`, `service.internalPort` and `service.externalPort` have been regrouped under the `service.ports` map.
- `metrics.kafka.service.port` has been regrouped under the `metrics.kafka.service.ports` map.
- `metrics.jmx.service.port` has been regrouped under the `metrics.jmx.service.ports` map.
- `updateStrategy` (string) and `rollingUpdatePartition` are regrouped under the `updateStrategy` map.
- Several parameters marked as deprecated `14.x.x` are not supported anymore.

Additionally updates the ZooKeeper subchart to it newest major, `8.0.0`, which contains similar changes.

### To 14.0.0

In this version, the `image` block is defined once and is used in the different templates, while in the previous version, the `image` block was duplicated for the main container and the provisioning one

```yaml
image:
  registry: docker.io
  repository: bitnami/kafka
  tag: 2.8.0
```

VS

```yaml
image:
  registry: docker.io
  repository: bitnami/kafka
  tag: 2.8.0
...
provisioning:
  image:
    registry: docker.io
    repository: bitnami/kafka
    tag: 2.8.0
```

See [PR#7114](https://github.com/bitnami/charts/pull/7114) for more info about the implemented changes

### To 13.0.0

This major updates the Zookeeper subchart to it newest major, 7.0.0, which renames all TLS-related settings. For more information on this subchart's major, please refer to [zookeeper upgrade notes](https://github.com/bitnami/charts/tree/main/bitnami/zookeeper#to-700).

### To 12.2.0

This version also introduces `bitnami/common`, a [library chart](https://helm.sh/docs/topics/library_charts/#helm) as a dependency. More documentation about this new utility could be found [here](https://github.com/bitnami/charts/tree/main/bitnami/common#bitnami-common-library-chart). Please, make sure that you have updated the chart dependencies before executing any upgrade.

### To 12.0.0

[On November 13, 2020, Helm v2 support was formally finished](https://github.com/helm/charts#status-of-the-project), this major version is the result of the required changes applied to the Helm Chart to be able to incorporate the different features added in Helm v3 and to be consistent with the Helm project itself regarding the Helm v2 EOL.

**What changes were introduced in this major version?**

- Previous versions of this Helm Chart use `apiVersion: v1` (installable by both Helm 2 and 3), this Helm Chart was updated to `apiVersion: v2` (installable by Helm 3 only). [Here](https://helm.sh/docs/topics/charts/#the-apiversion-field) you can find more information about the `apiVersion` field.
- Move dependency information from the *requirements.yaml* to the *Chart.yaml*
- After running `helm dependency update`, a *Chart.lock* file is generated containing the same structure used in the previous *requirements.lock*
- The different fields present in the *Chart.yaml* file has been ordered alphabetically in a homogeneous way for all the Bitnami Helm Charts

**Considerations when upgrading to this version**

- If you want to upgrade to this version from a previous one installed with Helm v3, you shouldn't face any issues
- If you want to upgrade to this version using Helm v2, this scenario is not supported as this version doesn't support Helm v2 anymore
- If you installed the previous version with Helm v2 and wants to upgrade to this version with Helm v3, please refer to the [official Helm documentation](https://helm.sh/docs/topics/v2_v3_migration/#migration-use-cases) about migrating from Helm v2 to v3

**Useful links**

- https://docs.bitnami.com/tutorials/resolve-helm2-helm3-post-migration-issues/
- https://helm.sh/docs/topics/v2_v3_migration/
- https://helm.sh/blog/migrate-from-helm-v2-to-helm-v3/

### To 11.8.0

External access to brokers can now be achieved through the cluster's Kafka service.

- `service.nodePort` -> deprecated  in favor of `service.nodePorts.client` and `service.nodePorts.external`

### To 11.7.0

The way to configure the users and passwords changed. Now it is allowed to create multiple users during the installation by providing the list of users and passwords.

- `auth.jaas.clientUser` (string) -> deprecated  in favor of `auth.jaas.clientUsers` (array).
- `auth.jaas.clientPassword` (string) -> deprecated  in favor of `auth.jaas.clientPasswords` (array).

### To 11.0.0

The way to configure listeners and athentication on Kafka is totally refactored allowing users to configure different authentication protocols on different listeners. Please check the [Listeners Configuration](#listeners-configuration) section for more information.

Backwards compatibility is not guaranteed you adapt your values.yaml to the new format. Here you can find some parameters that were renamed or disappeared in favor of new ones on this major version:

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
helm upgrade kafka my-repo/kafka --version 6.1.8 --set metrics.kafka.enabled=false
helm upgrade kafka my-repo/kafka --version 7.0.0 --set metrics.kafka.enabled=true
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

## License

Copyright &copy; 2022 Bitnami

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.