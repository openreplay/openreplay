# kyverno

Kubernetes Native Policy Management

![Version: 3.0.1](https://img.shields.io/badge/Version-3.0.1-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: v1.10.0](https://img.shields.io/badge/AppVersion-v1.10.0-informational?style=flat-square)

## About

[Kyverno](https://kyverno.io) is a Kubernetes Native Policy Management engine.

It allows you to:
- Manage policies as Kubernetes resources (no new language required.)
- Validate, mutate, and generate resource configurations.
- Select resources based on labels and wildcards.
- View policy enforcement as events.
- Scan existing resources for violations.

This chart bootstraps a Kyverno deployment on a [Kubernetes](http://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.

Access the complete user documentation and guides at: https://kyverno.io.

## Installing the Chart

**IMPORTANT IMPORTANT IMPORTANT IMPORTANT**

This chart changed significantly between `v2` and `v3`. If you are upgrading from `v2`, please read `Migrating from v2 to v3` section.

**Add the Kyverno Helm repository:**

```console
$ helm repo add kyverno https://kyverno.github.io/kyverno/
```

**Create a namespace:**

You can install Kyverno in any namespace. The examples use `kyverno` as the namespace.

```console
$ kubectl create namespace kyverno
```

**Install the Kyverno chart:**

```console
$ helm install kyverno --namespace kyverno kyverno/kyverno
```

The command deploys Kyverno on the Kubernetes cluster with default configuration. The [installation](https://kyverno.io/docs/installation/) guide lists the parameters that can be configured during installation.

The Kyverno ClusterRole/ClusterRoleBinding that manages webhook configurations must have the suffix `:webhook`. Ex., `*:webhook` or `kyverno:webhook`.
Other ClusterRole/ClusterRoleBinding names are configurable.

**Notes on using ArgoCD:**

When deploying this chart with ArgoCD you will need to enable `Replace` in the `syncOptions`, and you probably want to ignore diff in aggregated cluster roles.

You can do so by following instructions in these pages of ArgoCD documentation:
- [Enable Replace in the syncOptions](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/#replace-resource-instead-of-applying-changes)
- [Ignore diff in aggregated cluster roles](https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/#ignoring-rbac-changes-made-by-aggregateroles)

ArgoCD uses helm only for templating but applies the results with `kubectl`.

Unfortunately `kubectl` adds metadata that will cross the limit allowed by Kubernetes. Using `Replace` overcomes this limitation.

Another option is to use server side apply, this will be supported in ArgoCD v2.5.

Finally, we introduced new CRDs in 1.8 to manage resource-level reports. Those reports are associated with parent resources using an `ownerReference` object.

As a consequence, ArgoCD will show those reports in the UI, but as they are managed dynamically by Kyverno it can pollute your dashboard.

You can tell ArgoCD to ignore reports globally by adding them under the `resource.exclusions` stanza in the ArgoCD ConfigMap.

```yaml
    resource.exclusions: |
      - apiGroups:
          - kyverno.io
        kinds:
          - AdmissionReport
          - BackgroundScanReport
          - ClusterAdmissionReport
          - ClusterBackgroundScanReport
        clusters:
          - '*'
```

Below is an example of ArgoCD Application manifest that should work with this chart.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kyverno
  namespace: argocd
spec:
  destination:
    namespace: kyverno
    server: https://kubernetes.default.svc
  project: default
  source:
    chart: kyverno
    repoURL: https://kyverno.github.io/kyverno
    targetRevision: 2.6.0
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - Replace=true
```

## Migrating from v2 to v3

Direct upgrades from v2 of the Helm chart to v3 are not supported due to the number of breaking changes and manual intervention is required. Review and select an option after carefully reading below. Because either method requires down time, an upgrade should only be performed during a maintenance window. Regardless of the chosen option, please read all release notes very carefully to understand the full extent of changes brought by Kyverno 1.10. Release notes can be found at https://github.com/kyverno/kyverno/releases.

### Option 1 - Uninstallation and Reinstallation

The first option for upgrading, which is the recommended option, involves backing up Kyverno policy resources, uninstalling Kyverno, and reinstalling with v3 of the chart. Policy Reports for policies which have background mode enabled will be regenerated upon the next scan interval.

**Pros**

* Reduced complexity with minimal effort
* Allows re-checking older policies against new validation webhooks in 1.10

**Cons**

* Policy Reports which contained results only from admission mode and from policies/rules where background scans were disabled will be lost.

Follow the procedure below.

1. READ THE COMPLETE RELEASE NOTES FIRST
2. Backup and export all Kyverno policy resources to a YAML manifest. Use the command `kubectl get pol,cpol,cleanpol,ccleanpol,polex -A > kyvernobackup.yaml`.
3. Uninstall your current version of Kyverno.
4. Review the [New Chart Values](#new-chart-values) section and translate your desired features and configurations to the new format.
5. Install the v3 chart with Kyverno 1.10.
6. Restore your Kyverno policies. Use the command `kubectl create -f kyvernobackup.yaml`.

### Option 2 - Scale to Zero

In the second option, Kyverno policies do not have to be backed up however you perform more manual work in order to prepare for the upgrade to chart v3.

**Pros**

* Policy Reports which contained results from admission mode will be preserved
* Kyverno policies do not need to be backed up first

**Cons**

* More manual effort is required
* Older policies will not be revalidated for correctness according to the breaking schema changes. Some policies may not work as they did before.

Follow the procedure below.

1. READ THE COMPLETE RELEASE NOTES FIRST
2. Scale the `kyverno` Deployment to zero replicas.
3. If coming from 1.9 and you have install the cleanup controller, scale the `kyverno-cleanup-controller` Deployment to zero replicas.
4. If step 3 applied to you, now delete the cleanup Deployment.
5. Review the [New Chart Values](#new-chart-values) section and translate your desired features and configurations to the new format.
6. Upgrade to the v3 chart by passing the mandatory flag `upgrade.fromV2=true`.

### New Chart Values

In `v3` chart values changed significantly, please read the instructions below to migrate your values:

- `config.metricsConfig` is now `metricsConfig`
- `resourceFiltersExcludeNamespaces` has been replaced with `config.resourceFiltersExcludeNamespaces`
- `excludeKyvernoNamespace` has been replaced with `config.excludeKyvernoNamespace`
- `config.existingConfig` has been replaced with `config.create` and `config.name` to __support bring your own config__
- `config.existingMetricsConfig` has been replaced with `metricsConfig.create` and `metricsConfig.name` to __support bring your own config__
- `namespace` has been renamed `namespaceOverride`
- `installCRDs` has been replaced with `crds.install`
- `testImage` has been replaced with `test.image`
- `testResources` has been replaced with `test.resources`
- `testSecurityContext` has been replaced with `test.securityContext`
- `replicaCount` has been replaced with `admissionController.replicas`
- `updateStrategy` has been replaced with `admissionController.updateStrategy`
- `priorityClassName` has been replaced with `admissionController.priorityClassName`
- `hostNetwork` has been replaced with `admissionController.hostNetwork`
- `dnsPolicy` has been replaced with `admissionController.dnsPolicy`
- `nodeSelector` has been replaced with `admissionController.nodeSelector`
- `tolerations` has been replaced with `admissionController.tolerations`
- `topologySpreadConstraints` has been replaced with `admissionController.topologySpreadConstraints`
- `podDisruptionBudget` has been replaced with `admissionController.podDisruptionBudget`
- `antiAffinity` has been replaced with `admissionController.antiAffinity`
- `antiAffinity.enable` has been replaced with `admissionController.antiAffinity.enabled`
- `podAntiAffinity` has been replaced with `admissionController.podAntiAffinity`
- `podAffinity` has been replaced with `admissionController.podAffinity`
- `nodeAffinity` has been replaced with `admissionController.nodeAffinity`
- `startupProbe` has been replaced with `admissionController.startupProbe`
- `livenessProbe` has been replaced with `admissionController.livenessProbe`
- `readinessProbe` has been replaced with `admissionController.readinessProbe`
- `createSelfSignedCert` has been replaced with `admissionController.createSelfSignedCert`
- `serviceMonitor` has been replaced with `admissionController.serviceMonitor`
- `podSecurityContext` has been replaced with `admissionController.podSecurityContext`
- `tufRootMountPath` has been replaced with `admissionController.tufRootMountPath`
- `sigstoreVolume` has been replaced with `admissionController.sigstoreVolume`
- `initImage` has been replaced with `admissionController.initContainer.image`
- `initResources` has been replaced with `admissionController.initContainer.resources`
- `image` has been replaced with `admissionController.container.image`
- `image.pullSecrets` has been replaced with `admissionController.imagePullSecrets`
- `resources` has been replaced with `admissionController.container.resources`
- `service` has been replaced with `admissionController.service`
- `metricsService` has been replaced with `admissionController.metricsService`
- `initContainer.extraArgs` has been replaced with `admissionController.initContainer.extraArgs`
- `envVarsInit` has been replaced with `admissionController.initContainer.extraEnvVars`
- `envVars` has been replaced with `admissionController.container.extraEnvVars`
- `extraArgs` has been replaced with `admissionController.container.extraArgs`
- `extraInitContainers` has been replaced with `admissionController.extraInitContainers`
- `extraContainers` has been replaced with `admissionController.extraContainers`
- `podLabels` has been replaced with `admissionController.podLabels`
- `podAnnotations` has been replaced with `admissionController.podAnnotations`
- `securityContext` has been replaced with `admissionController.container.securityContext` and `admissionController.initContainer.securityContext`
- `rbac` has been replaced with `admissionController.rbac`
- `generatecontrollerExtraResources` has been replaced with `admissionController.rbac.clusterRole.extraResources`
- `networkPolicy` has been replaced with `admissionController.networkPolicy`
- all `extraArgs` now use objects instead of arrays
- logging, tracing and metering are now configured using `*Controller.logging`, `*Controller.tracing` and `*Controller.metering`

- Labels and selectors have been reworked and due to immutability, upgrading from `v2` to `v3` is going to be rejected. The easiest solution is to uninstall `v2` and reinstall `v3` once values have been adapted to the changes described above.

- Image tags are now validated and must be strings, if you use image tags in the `1.35` form please add quotes around the tag value.

- Image references are now using the `registry` setting, if you override the registry or repository fields please use `registry` (`--set image.registry=ghcr.io --set image.repository=kyverno/kyverno` instead of `--set image.repository=ghcr.io/kyverno/kyverno`).

- Admission controller `Deployment` name changed from `kyverno` to `kyverno-admission-controller`.
- `config.excludeUsername` was renamed to `config.excludeUsernames`
- `config.excludeGroupRole` was renamed to `config.excludeGroups`

Hardcoded defaults for `config.excludeGroups` and `config.excludeUsernames` have been removed, please review those fields if you provide your own exclusions.

## Uninstalling the Chart

To uninstall/delete the `kyverno` deployment:

```console
$ helm delete -n kyverno kyverno
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Values

The chart values are organised per component.

### Custom resource definitions

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| crds.install | bool | `true` | Whether to have Helm install the Kyverno CRDs, if the CRDs are not installed by Helm, they must be added before policies can be created |
| crds.annotations | object | `{}` | Additional CRDs annotations |

### Config

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| config.create | bool | `true` | Create the configmap. |
| config.name | string | `nil` | The configmap name (required if `create` is `false`). |
| config.annotations | object | `{}` | Additional annotations to add to the configmap. |
| config.enableDefaultRegistryMutation | bool | `true` | Enable registry mutation for container images. Enabled by default. |
| config.defaultRegistry | string | `"docker.io"` | The registry hostname used for the image mutation. |
| config.excludeGroups | list | `["system:nodes"]` | Exclude groups |
| config.excludeUsernames | list | `[]` | Exclude usernames |
| config.excludeRoles | list | `[]` | Exclude roles |
| config.excludeClusterRoles | list | `[]` | Exclude roles |
| config.generateSuccessEvents | bool | `false` | Generate success events. |
| config.resourceFilters | list | See [values.yaml](values.yaml) | Resource types to be skipped by the Kyverno policy engine. Make sure to surround each entry in quotes so that it doesn't get parsed as a nested YAML list. These are joined together without spaces, run through `tpl`, and the result is set in the config map. |
| config.webhooks | list | `[]` | Defines the `namespaceSelector` in the webhook configurations. Note that it takes a list of `namespaceSelector` and/or `objectSelector` in the JSON format, and only the first element will be forwarded to the webhook configurations. The Kyverno namespace is excluded if `excludeKyvernoNamespace` is `true` (default) |
| config.webhookAnnotations | object | `{}` | Defines annotations to set on webhook configurations. |
| config.excludeKyvernoNamespace | bool | `true` | Exclude Kyverno namespace Determines if default Kyverno namespace exclusion is enabled for webhooks and resourceFilters |
| config.resourceFiltersExcludeNamespaces | list | `[]` | resourceFilter namespace exclude Namespaces to exclude from the default resourceFilters |

### Metrics config

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| metricsConfig.create | bool | `true` | Create the configmap. |
| metricsConfig.name | string | `nil` | The configmap name (required if `create` is `false`). |
| metricsConfig.annotations | object | `{}` | Additional annotations to add to the configmap. |
| metricsConfig.namespaces.include | list | `[]` | List of namespaces to capture metrics for. |
| metricsConfig.namespaces.exclude | list | `[]` | list of namespaces to NOT capture metrics for. |
| metricsConfig.metricsRefreshInterval | string | `nil` | Rate at which metrics should reset so as to clean up the memory footprint of kyverno metrics, if you might be expecting high memory footprint of Kyverno's metrics. Default: 0, no refresh of metrics |

### Features

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| features.admissionReports.enabled | bool | `true` | Enables the feature |
| features.autoUpdateWebhooks.enabled | bool | `true` | Enables the feature |
| features.backgroundScan.enabled | bool | `true` | Enables the feature |
| features.backgroundScan.backgroundScanWorkers | int | `2` | Number of background scan workers |
| features.backgroundScan.backgroundScanInterval | string | `"1h"` | Background scan interval |
| features.backgroundScan.skipResourceFilters | bool | `true` | Skips resource filters in background scan |
| features.configMapCaching.enabled | bool | `true` | Enables the feature |
| features.dumpPayload.enabled | bool | `false` | Enables the feature |
| features.forceFailurePolicyIgnore.enabled | bool | `false` | Enables the feature |
| features.logging.format | string | `"text"` | Logging format |
| features.logging.verbosity | int | `2` | Logging verbosity |
| features.omitEvents.eventTypes | list | `[]` | Events which should not be emitted (possible values `PolicyViolation`, `PolicyApplied`, `PolicyError`, and `PolicySkipped`) |
| features.policyExceptions.enabled | bool | `false` | Enables the feature |
| features.policyExceptions.namespace | string | `""` | Restrict policy exceptions to a single namespace |
| features.protectManagedResources.enabled | bool | `false` | Enables the feature |
| features.registryClient.allowInsecure | bool | `false` | Allow insecure registry |
| features.registryClient.credentialHelpers | list | `["default","google","amazon","azure","github"]` | Enable registry client helpers |
| features.reports.chunkSize | int | `1000` | Reports chunk size |

### Admission controller

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| admissionController.featuresOverride | object | `{}` | Overrides features defined at the root level |
| admissionController.rbac.create | bool | `true` | Create RBAC resources |
| admissionController.rbac.serviceAccount.name | string | `nil` | The ServiceAccount name |
| admissionController.rbac.serviceAccount.annotations | object | `{}` | Annotations for the ServiceAccount |
| admissionController.rbac.clusterRole.extraResources | list | `[]` | Extra resource permissions to add in the cluster role |
| admissionController.createSelfSignedCert | bool | `false` | Create self-signed certificates at deployment time. The certificates won't be automatically renewed if this is set to `true`. |
| admissionController.replicas | int | `nil` | Desired number of pods |
| admissionController.podLabels | object | `{}` | Additional labels to add to each pod |
| admissionController.podAnnotations | object | `{}` | Additional annotations to add to each pod |
| admissionController.updateStrategy | object | See [values.yaml](values.yaml) | Deployment update strategy. Ref: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy |
| admissionController.priorityClassName | string | `""` | Optional priority class |
| admissionController.hostNetwork | bool | `false` | Change `hostNetwork` to `true` when you want the pod to share its host's network namespace. Useful for situations like when you end up dealing with a custom CNI over Amazon EKS. Update the `dnsPolicy` accordingly as well to suit the host network mode. |
| admissionController.dnsPolicy | string | `"ClusterFirst"` | `dnsPolicy` determines the manner in which DNS resolution happens in the cluster. In case of `hostNetwork: true`, usually, the `dnsPolicy` is suitable to be `ClusterFirstWithHostNet`. For further reference: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#pod-s-dns-policy. |
| admissionController.startupProbe | object | See [values.yaml](values.yaml) | Startup probe. The block is directly forwarded into the deployment, so you can use whatever startupProbes configuration you want. ref: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/ |
| admissionController.livenessProbe | object | See [values.yaml](values.yaml) | Liveness probe. The block is directly forwarded into the deployment, so you can use whatever livenessProbe configuration you want. ref: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/ |
| admissionController.readinessProbe | object | See [values.yaml](values.yaml) | Readiness Probe. The block is directly forwarded into the deployment, so you can use whatever readinessProbe configuration you want. ref: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/ |
| admissionController.nodeSelector | object | `{}` | Node labels for pod assignment |
| admissionController.tolerations | list | `[]` | List of node taints to tolerate |
| admissionController.antiAffinity.enabled | bool | `true` | Pod antiAffinities toggle. Enabled by default but can be disabled if you want to schedule pods to the same node. |
| admissionController.podAntiAffinity | object | See [values.yaml](values.yaml) | Pod anti affinity constraints. |
| admissionController.podAffinity | object | `{}` | Pod affinity constraints. |
| admissionController.nodeAffinity | object | `{}` | Node affinity constraints. |
| admissionController.topologySpreadConstraints | list | `[]` | Topology spread constraints. |
| admissionController.podSecurityContext | object | `{}` | Security context for the pod |
| admissionController.podDisruptionBudget.minAvailable | int | `1` | Configures the minimum available pods for disruptions. Cannot be used if `maxUnavailable` is set. |
| admissionController.podDisruptionBudget.maxUnavailable | string | `nil` | Configures the maximum unavailable pods for disruptions. Cannot be used if `minAvailable` is set. |
| admissionController.tufRootMountPath | string | `"/.sigstore"` | A writable volume to use for the TUF root initialization. |
| admissionController.sigstoreVolume | object | `{"emptyDir":{}}` | Volume to be mounted in pods for TUF/cosign work. |
| admissionController.imagePullSecrets | list | `[]` | Image pull secrets |
| admissionController.initContainer.image.registry | string | `"ghcr.io"` | Image registry |
| admissionController.initContainer.image.repository | string | `"kyverno/kyvernopre"` | Image repository |
| admissionController.initContainer.image.tag | string | `nil` | Image tag If missing, defaults to image.tag |
| admissionController.initContainer.image.pullPolicy | string | `nil` | Image pull policy If missing, defaults to image.pullPolicy |
| admissionController.initContainer.resources.limits | object | `{"cpu":"100m","memory":"256Mi"}` | Pod resource limits |
| admissionController.initContainer.resources.requests | object | `{"cpu":"10m","memory":"64Mi"}` | Pod resource requests |
| admissionController.initContainer.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Container security context |
| admissionController.initContainer.extraArgs | object | `{}` | Additional container args. |
| admissionController.initContainer.extraEnvVars | list | `[]` | Additional container environment variables. |
| admissionController.container.image.registry | string | `"ghcr.io"` | Image registry |
| admissionController.container.image.repository | string | `"kyverno/kyverno"` | Image repository |
| admissionController.container.image.tag | string | `nil` | Image tag Defaults to appVersion in Chart.yaml if omitted |
| admissionController.container.image.pullPolicy | string | `"IfNotPresent"` | Image pull policy |
| admissionController.container.resources.limits | object | `{"memory":"384Mi"}` | Pod resource limits |
| admissionController.container.resources.requests | object | `{"cpu":"100m","memory":"128Mi"}` | Pod resource requests |
| admissionController.container.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Container security context |
| admissionController.container.extraArgs | object | `{}` | Additional container args. |
| admissionController.container.extraEnvVars | list | `[]` | Additional container environment variables. |
| admissionController.extraInitContainers | list | `[]` | Array of extra init containers |
| admissionController.extraContainers | list | `[]` | Array of extra containers to run alongside kyverno |
| admissionController.service.port | int | `443` | Service port. |
| admissionController.service.type | string | `"ClusterIP"` | Service type. |
| admissionController.service.nodePort | string | `nil` | Service node port. Only used if `type` is `NodePort`. |
| admissionController.service.annotations | object | `{}` | Service annotations. |
| admissionController.metricsService.create | bool | `true` | Create service. |
| admissionController.metricsService.port | int | `8000` | Service port. Kyverno's metrics server will be exposed at this port. |
| admissionController.metricsService.type | string | `"ClusterIP"` | Service type. |
| admissionController.metricsService.nodePort | string | `nil` | Service node port. Only used if `type` is `NodePort`. |
| admissionController.metricsService.annotations | object | `{}` | Service annotations. |
| admissionController.networkPolicy.enabled | bool | `false` | When true, use a NetworkPolicy to allow ingress to the webhook This is useful on clusters using Calico and/or native k8s network policies in a default-deny setup. |
| admissionController.networkPolicy.ingressFrom | list | `[]` | A list of valid from selectors according to https://kubernetes.io/docs/concepts/services-networking/network-policies. |
| admissionController.serviceMonitor.enabled | bool | `false` | Create a `ServiceMonitor` to collect Prometheus metrics. |
| admissionController.serviceMonitor.additionalLabels | object | `{}` | Additional labels |
| admissionController.serviceMonitor.namespace | string | `nil` | Override namespace |
| admissionController.serviceMonitor.interval | string | `"30s"` | Interval to scrape metrics |
| admissionController.serviceMonitor.scrapeTimeout | string | `"25s"` | Timeout if metrics can't be retrieved in given time interval |
| admissionController.serviceMonitor.secure | bool | `false` | Is TLS required for endpoint |
| admissionController.serviceMonitor.tlsConfig | object | `{}` | TLS Configuration for endpoint |
| admissionController.tracing.enabled | bool | `false` | Enable tracing |
| admissionController.tracing.address | string | `nil` | Traces receiver address |
| admissionController.tracing.port | string | `nil` | Traces receiver port |
| admissionController.tracing.creds | string | `""` | Traces receiver credentials |
| admissionController.metering.disabled | bool | `false` | Disable metrics export |
| admissionController.metering.config | string | `"prometheus"` | Otel configuration, can be `prometheus` or `grpc` |
| admissionController.metering.port | int | `8000` | Prometheus endpoint port |
| admissionController.metering.collector | string | `""` | Otel collector endpoint |
| admissionController.metering.creds | string | `""` | Otel collector credentials |

### Background controller

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| backgroundController.featuresOverride | object | `{}` | Overrides features defined at the root level |
| backgroundController.enabled | bool | `true` | Enable background controller. |
| backgroundController.rbac.create | bool | `true` | Create RBAC resources |
| backgroundController.rbac.serviceAccount.name | string | `nil` | Service account name |
| backgroundController.rbac.serviceAccount.annotations | object | `{}` | Annotations for the ServiceAccount |
| backgroundController.rbac.clusterRole.extraResources | list | `[]` | Extra resource permissions to add in the cluster role |
| backgroundController.image.registry | string | `"ghcr.io"` | Image registry |
| backgroundController.image.repository | string | `"kyverno/background-controller"` | Image repository |
| backgroundController.image.tag | string | `nil` | Image tag Defaults to appVersion in Chart.yaml if omitted |
| backgroundController.image.pullPolicy | string | `"IfNotPresent"` | Image pull policy |
| backgroundController.imagePullSecrets | list | `[]` | Image pull secrets |
| backgroundController.replicas | int | `nil` | Desired number of pods |
| backgroundController.podLabels | object | `{}` | Additional labels to add to each pod |
| backgroundController.podAnnotations | object | `{}` | Additional annotations to add to each pod |
| backgroundController.updateStrategy | object | See [values.yaml](values.yaml) | Deployment update strategy. Ref: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy |
| backgroundController.priorityClassName | string | `""` | Optional priority class |
| backgroundController.hostNetwork | bool | `false` | Change `hostNetwork` to `true` when you want the pod to share its host's network namespace. Useful for situations like when you end up dealing with a custom CNI over Amazon EKS. Update the `dnsPolicy` accordingly as well to suit the host network mode. |
| backgroundController.dnsPolicy | string | `"ClusterFirst"` | `dnsPolicy` determines the manner in which DNS resolution happens in the cluster. In case of `hostNetwork: true`, usually, the `dnsPolicy` is suitable to be `ClusterFirstWithHostNet`. For further reference: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#pod-s-dns-policy. |
| backgroundController.extraArgs | object | `{}` | Extra arguments passed to the container on the command line |
| backgroundController.resources.limits | object | `{"memory":"128Mi"}` | Pod resource limits |
| backgroundController.resources.requests | object | `{"cpu":"100m","memory":"64Mi"}` | Pod resource requests |
| backgroundController.nodeSelector | object | `{}` | Node labels for pod assignment |
| backgroundController.tolerations | list | `[]` | List of node taints to tolerate |
| backgroundController.antiAffinity.enabled | bool | `true` | Pod antiAffinities toggle. Enabled by default but can be disabled if you want to schedule pods to the same node. |
| backgroundController.podAntiAffinity | object | See [values.yaml](values.yaml) | Pod anti affinity constraints. |
| backgroundController.podAffinity | object | `{}` | Pod affinity constraints. |
| backgroundController.nodeAffinity | object | `{}` | Node affinity constraints. |
| backgroundController.topologySpreadConstraints | list | `[]` | Topology spread constraints. |
| backgroundController.podSecurityContext | object | `{}` | Security context for the pod |
| backgroundController.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Security context for the containers |
| backgroundController.podDisruptionBudget.minAvailable | int | `1` | Configures the minimum available pods for disruptions. Cannot be used if `maxUnavailable` is set. |
| backgroundController.podDisruptionBudget.maxUnavailable | string | `nil` | Configures the maximum unavailable pods for disruptions. Cannot be used if `minAvailable` is set. |
| backgroundController.metricsService.create | bool | `true` | Create service. |
| backgroundController.metricsService.port | int | `8000` | Service port. Metrics server will be exposed at this port. |
| backgroundController.metricsService.type | string | `"ClusterIP"` | Service type. |
| backgroundController.metricsService.nodePort | string | `nil` | Service node port. Only used if `metricsService.type` is `NodePort`. |
| backgroundController.metricsService.annotations | object | `{}` | Service annotations. |
| backgroundController.networkPolicy.enabled | bool | `false` | When true, use a NetworkPolicy to allow ingress to the webhook This is useful on clusters using Calico and/or native k8s network policies in a default-deny setup. |
| backgroundController.networkPolicy.ingressFrom | list | `[]` | A list of valid from selectors according to https://kubernetes.io/docs/concepts/services-networking/network-policies. |
| backgroundController.serviceMonitor.enabled | bool | `false` | Create a `ServiceMonitor` to collect Prometheus metrics. |
| backgroundController.serviceMonitor.additionalLabels | object | `{}` | Additional labels |
| backgroundController.serviceMonitor.namespace | string | `nil` | Override namespace |
| backgroundController.serviceMonitor.interval | string | `"30s"` | Interval to scrape metrics |
| backgroundController.serviceMonitor.scrapeTimeout | string | `"25s"` | Timeout if metrics can't be retrieved in given time interval |
| backgroundController.serviceMonitor.secure | bool | `false` | Is TLS required for endpoint |
| backgroundController.serviceMonitor.tlsConfig | object | `{}` | TLS Configuration for endpoint |
| backgroundController.tracing.enabled | bool | `false` | Enable tracing |
| backgroundController.tracing.address | string | `nil` | Traces receiver address |
| backgroundController.tracing.port | string | `nil` | Traces receiver port |
| backgroundController.tracing.creds | string | `""` | Traces receiver credentials |
| backgroundController.metering.disabled | bool | `false` | Disable metrics export |
| backgroundController.metering.config | string | `"prometheus"` | Otel configuration, can be `prometheus` or `grpc` |
| backgroundController.metering.port | int | `8000` | Prometheus endpoint port |
| backgroundController.metering.collector | string | `""` | Otel collector endpoint |
| backgroundController.metering.creds | string | `""` | Otel collector credentials |

### Cleanup controller

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| cleanupController.featuresOverride | object | `{}` | Overrides features defined at the root level |
| cleanupController.enabled | bool | `true` | Enable cleanup controller. |
| cleanupController.rbac.create | bool | `true` | Create RBAC resources |
| cleanupController.rbac.serviceAccount.name | string | `nil` | Service account name |
| cleanupController.rbac.serviceAccount.annotations | object | `{}` | Annotations for the ServiceAccount |
| cleanupController.rbac.clusterRole.extraResources | list | `[]` | Extra resource permissions to add in the cluster role |
| cleanupController.createSelfSignedCert | bool | `false` | Create self-signed certificates at deployment time. The certificates won't be automatically renewed if this is set to `true`. |
| cleanupController.image.registry | string | `"ghcr.io"` | Image registry |
| cleanupController.image.repository | string | `"kyverno/cleanup-controller"` | Image repository |
| cleanupController.image.tag | string | `nil` | Image tag Defaults to appVersion in Chart.yaml if omitted |
| cleanupController.image.pullPolicy | string | `"IfNotPresent"` | Image pull policy |
| cleanupController.imagePullSecrets | list | `[]` | Image pull secrets |
| cleanupController.replicas | int | `nil` | Desired number of pods |
| cleanupController.podLabels | object | `{}` | Additional labels to add to each pod |
| cleanupController.podAnnotations | object | `{}` | Additional annotations to add to each pod |
| cleanupController.updateStrategy | object | See [values.yaml](values.yaml) | Deployment update strategy. Ref: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy |
| cleanupController.priorityClassName | string | `""` | Optional priority class |
| cleanupController.hostNetwork | bool | `false` | Change `hostNetwork` to `true` when you want the pod to share its host's network namespace. Useful for situations like when you end up dealing with a custom CNI over Amazon EKS. Update the `dnsPolicy` accordingly as well to suit the host network mode. |
| cleanupController.dnsPolicy | string | `"ClusterFirst"` | `dnsPolicy` determines the manner in which DNS resolution happens in the cluster. In case of `hostNetwork: true`, usually, the `dnsPolicy` is suitable to be `ClusterFirstWithHostNet`. For further reference: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#pod-s-dns-policy. |
| cleanupController.extraArgs | object | `{}` | Extra arguments passed to the container on the command line |
| cleanupController.resources.limits | object | `{"memory":"128Mi"}` | Pod resource limits |
| cleanupController.resources.requests | object | `{"cpu":"100m","memory":"64Mi"}` | Pod resource requests |
| cleanupController.startupProbe | object | See [values.yaml](values.yaml) | Startup probe. The block is directly forwarded into the deployment, so you can use whatever startupProbes configuration you want. ref: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/ |
| cleanupController.livenessProbe | object | See [values.yaml](values.yaml) | Liveness probe. The block is directly forwarded into the deployment, so you can use whatever livenessProbe configuration you want. ref: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/ |
| cleanupController.readinessProbe | object | See [values.yaml](values.yaml) | Readiness Probe. The block is directly forwarded into the deployment, so you can use whatever readinessProbe configuration you want. ref: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/ |
| cleanupController.nodeSelector | object | `{}` | Node labels for pod assignment |
| cleanupController.tolerations | list | `[]` | List of node taints to tolerate |
| cleanupController.antiAffinity.enabled | bool | `true` | Pod antiAffinities toggle. Enabled by default but can be disabled if you want to schedule pods to the same node. |
| cleanupController.podAntiAffinity | object | See [values.yaml](values.yaml) | Pod anti affinity constraints. |
| cleanupController.podAffinity | object | `{}` | Pod affinity constraints. |
| cleanupController.nodeAffinity | object | `{}` | Node affinity constraints. |
| cleanupController.topologySpreadConstraints | list | `[]` | Topology spread constraints. |
| cleanupController.podSecurityContext | object | `{}` | Security context for the pod |
| cleanupController.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Security context for the containers |
| cleanupController.podDisruptionBudget.minAvailable | int | `1` | Configures the minimum available pods for disruptions. Cannot be used if `maxUnavailable` is set. |
| cleanupController.podDisruptionBudget.maxUnavailable | string | `nil` | Configures the maximum unavailable pods for disruptions. Cannot be used if `minAvailable` is set. |
| cleanupController.service.port | int | `443` | Service port. |
| cleanupController.service.type | string | `"ClusterIP"` | Service type. |
| cleanupController.service.nodePort | string | `nil` | Service node port. Only used if `service.type` is `NodePort`. |
| cleanupController.service.annotations | object | `{}` | Service annotations. |
| cleanupController.metricsService.create | bool | `true` | Create service. |
| cleanupController.metricsService.port | int | `8000` | Service port. Metrics server will be exposed at this port. |
| cleanupController.metricsService.type | string | `"ClusterIP"` | Service type. |
| cleanupController.metricsService.nodePort | string | `nil` | Service node port. Only used if `metricsService.type` is `NodePort`. |
| cleanupController.metricsService.annotations | object | `{}` | Service annotations. |
| cleanupController.networkPolicy.enabled | bool | `false` | When true, use a NetworkPolicy to allow ingress to the webhook This is useful on clusters using Calico and/or native k8s network policies in a default-deny setup. |
| cleanupController.networkPolicy.ingressFrom | list | `[]` | A list of valid from selectors according to https://kubernetes.io/docs/concepts/services-networking/network-policies. |
| cleanupController.serviceMonitor.enabled | bool | `false` | Create a `ServiceMonitor` to collect Prometheus metrics. |
| cleanupController.serviceMonitor.additionalLabels | object | `{}` | Additional labels |
| cleanupController.serviceMonitor.namespace | string | `nil` | Override namespace |
| cleanupController.serviceMonitor.interval | string | `"30s"` | Interval to scrape metrics |
| cleanupController.serviceMonitor.scrapeTimeout | string | `"25s"` | Timeout if metrics can't be retrieved in given time interval |
| cleanupController.serviceMonitor.secure | bool | `false` | Is TLS required for endpoint |
| cleanupController.serviceMonitor.tlsConfig | object | `{}` | TLS Configuration for endpoint |
| cleanupController.tracing.enabled | bool | `false` | Enable tracing |
| cleanupController.tracing.address | string | `nil` | Traces receiver address |
| cleanupController.tracing.port | string | `nil` | Traces receiver port |
| cleanupController.tracing.creds | string | `""` | Traces receiver credentials |
| cleanupController.metering.disabled | bool | `false` | Disable metrics export |
| cleanupController.metering.config | string | `"prometheus"` | Otel configuration, can be `prometheus` or `grpc` |
| cleanupController.metering.port | int | `8000` | Prometheus endpoint port |
| cleanupController.metering.collector | string | `""` | Otel collector endpoint |
| cleanupController.metering.creds | string | `""` | Otel collector credentials |

### Reports controller

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| reportsController.featuresOverride | object | `{}` | Overrides features defined at the root level |
| reportsController.enabled | bool | `true` | Enable reports controller. |
| reportsController.rbac.create | bool | `true` | Create RBAC resources |
| reportsController.rbac.serviceAccount.name | string | `nil` | Service account name |
| reportsController.rbac.serviceAccount.annotations | object | `{}` | Annotations for the ServiceAccount |
| reportsController.rbac.clusterRole.extraResources | list | `[]` | Extra resource permissions to add in the cluster role |
| reportsController.image.registry | string | `"ghcr.io"` | Image registry |
| reportsController.image.repository | string | `"kyverno/reports-controller"` | Image repository |
| reportsController.image.tag | string | `nil` | Image tag Defaults to appVersion in Chart.yaml if omitted |
| reportsController.image.pullPolicy | string | `"IfNotPresent"` | Image pull policy |
| reportsController.imagePullSecrets | list | `[]` | Image pull secrets |
| reportsController.replicas | int | `nil` | Desired number of pods |
| reportsController.podLabels | object | `{}` | Additional labels to add to each pod |
| reportsController.podAnnotations | object | `{}` | Additional annotations to add to each pod |
| reportsController.updateStrategy | object | See [values.yaml](values.yaml) | Deployment update strategy. Ref: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy |
| reportsController.priorityClassName | string | `""` | Optional priority class |
| reportsController.hostNetwork | bool | `false` | Change `hostNetwork` to `true` when you want the pod to share its host's network namespace. Useful for situations like when you end up dealing with a custom CNI over Amazon EKS. Update the `dnsPolicy` accordingly as well to suit the host network mode. |
| reportsController.dnsPolicy | string | `"ClusterFirst"` | `dnsPolicy` determines the manner in which DNS resolution happens in the cluster. In case of `hostNetwork: true`, usually, the `dnsPolicy` is suitable to be `ClusterFirstWithHostNet`. For further reference: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#pod-s-dns-policy. |
| reportsController.extraArgs | object | `{}` | Extra arguments passed to the container on the command line |
| reportsController.resources.limits | object | `{"memory":"128Mi"}` | Pod resource limits |
| reportsController.resources.requests | object | `{"cpu":"100m","memory":"64Mi"}` | Pod resource requests |
| reportsController.nodeSelector | object | `{}` | Node labels for pod assignment |
| reportsController.tolerations | list | `[]` | List of node taints to tolerate |
| reportsController.antiAffinity.enabled | bool | `true` | Pod antiAffinities toggle. Enabled by default but can be disabled if you want to schedule pods to the same node. |
| reportsController.podAntiAffinity | object | See [values.yaml](values.yaml) | Pod anti affinity constraints. |
| reportsController.podAffinity | object | `{}` | Pod affinity constraints. |
| reportsController.nodeAffinity | object | `{}` | Node affinity constraints. |
| reportsController.topologySpreadConstraints | list | `[]` | Topology spread constraints. |
| reportsController.podSecurityContext | object | `{}` | Security context for the pod |
| reportsController.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Security context for the containers |
| reportsController.podDisruptionBudget.minAvailable | int | `1` | Configures the minimum available pods for disruptions. Cannot be used if `maxUnavailable` is set. |
| reportsController.podDisruptionBudget.maxUnavailable | string | `nil` | Configures the maximum unavailable pods for disruptions. Cannot be used if `minAvailable` is set. |
| reportsController.tufRootMountPath | string | `"/.sigstore"` | A writable volume to use for the TUF root initialization. |
| reportsController.sigstoreVolume | object | `{"emptyDir":{}}` | Volume to be mounted in pods for TUF/cosign work. |
| reportsController.metricsService.create | bool | `true` | Create service. |
| reportsController.metricsService.port | int | `8000` | Service port. Metrics server will be exposed at this port. |
| reportsController.metricsService.type | string | `"ClusterIP"` | Service type. |
| reportsController.metricsService.nodePort | string | `nil` | Service node port. Only used if `type` is `NodePort`. |
| reportsController.metricsService.annotations | object | `{}` | Service annotations. |
| reportsController.networkPolicy.enabled | bool | `false` | When true, use a NetworkPolicy to allow ingress to the webhook This is useful on clusters using Calico and/or native k8s network policies in a default-deny setup. |
| reportsController.networkPolicy.ingressFrom | list | `[]` | A list of valid from selectors according to https://kubernetes.io/docs/concepts/services-networking/network-policies. |
| reportsController.serviceMonitor.enabled | bool | `false` | Create a `ServiceMonitor` to collect Prometheus metrics. |
| reportsController.serviceMonitor.additionalLabels | object | `{}` | Additional labels |
| reportsController.serviceMonitor.namespace | string | `nil` | Override namespace |
| reportsController.serviceMonitor.interval | string | `"30s"` | Interval to scrape metrics |
| reportsController.serviceMonitor.scrapeTimeout | string | `"25s"` | Timeout if metrics can't be retrieved in given time interval |
| reportsController.serviceMonitor.secure | bool | `false` | Is TLS required for endpoint |
| reportsController.serviceMonitor.tlsConfig | object | `{}` | TLS Configuration for endpoint |
| reportsController.tracing.enabled | bool | `false` | Enable tracing |
| reportsController.tracing.address | string | `nil` | Traces receiver address |
| reportsController.tracing.port | string | `nil` | Traces receiver port |
| reportsController.tracing.creds | string | `nil` | Traces receiver credentials |
| reportsController.metering.disabled | bool | `false` | Disable metrics export |
| reportsController.metering.config | string | `"prometheus"` | Otel configuration, can be `prometheus` or `grpc` |
| reportsController.metering.port | int | `8000` | Prometheus endpoint port |
| reportsController.metering.collector | string | `nil` | Otel collector endpoint |
| reportsController.metering.creds | string | `nil` | Otel collector credentials |

### Grafana

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| grafana.enabled | bool | `false` | Enable grafana dashboard creation. |
| grafana.configMapName | string | `"{{ include \"kyverno.fullname\" . }}-grafana"` | Configmap name template. |
| grafana.namespace | string | `nil` | Namespace to create the grafana dashboard configmap. If not set, it will be created in the same namespace where the chart is deployed. |
| grafana.annotations | object | `{}` | Grafana dashboard configmap annotations. |

### Webhooks cleanup

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| webhooksCleanup.enabled | bool | `false` | Create a helm pre-delete hook to cleanup webhooks. |
| webhooksCleanup.image | string | `"bitnami/kubectl:latest"` | `kubectl` image to run commands for deleting webhooks. |
| webhooksCleanup.imagePullSecrets | list | `[]` | Image pull secrets |

### Test

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| test.image.registry | string | `nil` | Image registry |
| test.image.repository | string | `"busybox"` | Image repository |
| test.image.tag | string | `"1.35"` | Image tag Defaults to `latest` if omitted |
| test.image.pullPolicy | string | `nil` | Image pull policy Defaults to image.pullPolicy if omitted |
| test.resources.limits | object | `{"cpu":"100m","memory":"256Mi"}` | Pod resource limits |
| test.resources.requests | object | `{"cpu":"10m","memory":"64Mi"}` | Pod resource requests |
| test.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"runAsGroup":65534,"runAsNonRoot":true,"runAsUser":65534,"seccompProfile":{"type":"RuntimeDefault"}}` | Security context for the test containers |

### Api version override

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| apiVersionOverride.podDisruptionBudget | string | `nil` | Override api version used to create `PodDisruptionBudget`` resources. When not specified the chart will check if `policy/v1/PodDisruptionBudget` is available to determine the api version automatically. |

### Cleanup jobs

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| cleanupJobs.admissionReports.enabled | bool | `true` | Enable cleanup cronjob |
| cleanupJobs.admissionReports.image.registry | string | `nil` | Image registry |
| cleanupJobs.admissionReports.image.repository | string | `"bitnami/kubectl"` | Image repository |
| cleanupJobs.admissionReports.image.tag | string | `"1.26.4"` | Image tag Defaults to `latest` if omitted |
| cleanupJobs.admissionReports.image.pullPolicy | string | `nil` | Image pull policy Defaults to image.pullPolicy if omitted |
| cleanupJobs.admissionReports.schedule | string | `"*/10 * * * *"` | Cronjob schedule |
| cleanupJobs.admissionReports.threshold | int | `10000` | Reports threshold, if number of reports are above this value the cronjob will start deleting them |
| cleanupJobs.admissionReports.history | object | `{"failure":1,"success":1}` | Cronjob history |
| cleanupJobs.admissionReports.podSecurityContext | object | `{}` | Security context for the pod |
| cleanupJobs.admissionReports.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Security context for the containers |
| cleanupJobs.clusterAdmissionReports.enabled | bool | `true` | Enable cleanup cronjob |
| cleanupJobs.clusterAdmissionReports.image.registry | string | `nil` | Image registry |
| cleanupJobs.clusterAdmissionReports.image.repository | string | `"bitnami/kubectl"` | Image repository |
| cleanupJobs.clusterAdmissionReports.image.tag | string | `"1.26.4"` | Image tag Defaults to `latest` if omitted |
| cleanupJobs.clusterAdmissionReports.image.pullPolicy | string | `nil` | Image pull policy Defaults to image.pullPolicy if omitted |
| cleanupJobs.clusterAdmissionReports.schedule | string | `"*/10 * * * *"` | Cronjob schedule |
| cleanupJobs.clusterAdmissionReports.threshold | int | `10000` | Reports threshold, if number of reports are above this value the cronjob will start deleting them |
| cleanupJobs.clusterAdmissionReports.history | object | `{"failure":1,"success":1}` | Cronjob history |
| cleanupJobs.clusterAdmissionReports.podSecurityContext | object | `{}` | Security context for the pod |
| cleanupJobs.clusterAdmissionReports.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Security context for the containers |

### Other

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| nameOverride | string | `nil` | Override the name of the chart |
| fullnameOverride | string | `nil` | Override the expanded name of the chart |
| namespaceOverride | string | `nil` | Override the namespace the chart deploys to |
| upgrade.fromV2 | bool | `false` | Upgrading from v2 to v3 is not allowed by default, set this to true once changes have been reviewed. |
| imagePullSecrets | object | `{}` | Image pull secrets for image verification policies, this will define the `--imagePullSecrets` argument |
| existingImagePullSecrets | list | `[]` | Existing Image pull secrets for image verification policies, this will define the `--imagePullSecrets` argument |
| customLabels | object | `{}` | Additional labels |

## TLS Configuration

If `admissionController.createSelfSignedCert` is `true`, Helm will take care of the steps of creating an external self-signed certificate described in option 2 of the [installation documentation](https://kyverno.io/docs/installation/#option-2-use-your-own-ca-signed-certificate)

If `admissionController.createSelfSignedCert` is `false`, Kyverno will generate a self-signed CA and a certificate, or you can provide your own TLS CA and signed-key pair and create the secret yourself as described in the [documentation](https://kyverno.io/docs/installation/#customize-the-installation-of-kyverno).

## Default resource filters

[Kyverno resource filters](https://kyverno.io/docs/installation/#resource-filters) are a used to exclude resources from the Kyverno engine rules processing.

This chart comes with default resource filters that apply exclusions on a couple of namespaces and resource kinds:
- all resources in `kube-system`, `kube-public` and `kube-node-lease` namespaces
- all resources in all namespaces for the following resource kinds:
  - `Event`
  - `Node`
  - `APIService`
  - `TokenReview`
  - `SubjectAccessReview`
  - `SelfSubjectAccessReview`
  - `Binding`
  - `ReplicaSet`
  - `AdmissionReport`
  - `ClusterAdmissionReport`
  - `BackgroundScanReport`
  - `ClusterBackgroundScanReport`
- all resources created by this chart itself

Those default exclusions are there to prevent disruptions as much as possible.
Under the hood, Kyverno installs an admission controller for critical cluster resources.
A cluster can become unresponsive if Kyverno is not up and running, ultimately preventing pods to be scheduled in the cluster.

You can however override the default resource filters by setting the `config.resourceFilters` stanza.
It contains an array of string templates that are passed through the `tpl` Helm function and joined together to produce the final `resourceFilters` written in the Kyverno config map.

Please consult the [values.yaml](./values.yaml) file before overriding `config.resourceFilters` and use the apropriate templates to build your desired exclusions list.

## High availability

Running a highly-available Kyverno installation is crucial in a production environment.

In order to run Kyverno in high availability mode, you should set `replicaCount` to `3` or more.
You should also pay attention to anti affinity rules, spreading pods across nodes and availability zones.

Please see https://kyverno.io/docs/installation/#security-vs-operability for more informations.

## Source Code

* <https://github.com/kyverno/kyverno>

## Requirements

Kubernetes: `>=1.16.0-0`

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| Nirmata |  | <https://kyverno.io/> |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.11.0](https://github.com/norwoodj/helm-docs/releases/v1.11.0)
