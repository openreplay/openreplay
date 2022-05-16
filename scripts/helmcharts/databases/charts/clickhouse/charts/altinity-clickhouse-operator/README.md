# altinity-clickhouse-operator

![Version: 0.0.13](https://img.shields.io/badge/Version-0.0.13-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.18.1](https://img.shields.io/badge/AppVersion-0.18.1-informational?style=flat-square)

Helm chart to deploy [altinity-clickhouse-operator](https://github.com/Altinity/clickhouse-operator).

The ClickHouse Operator creates, configures and manages ClickHouse clusters running on Kubernetes.

Refer to operator repo for additional information.

**Homepage:** <https://github.com/slamdev/helm-charts/tree/master/charts/altinity-clickhouse-operator>

## Maintainers

| Name | Email | Url |
| ---- | ------ | --- |
| slamdev | valentin.fedoskin@gmail.com |  |

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | affinity for scheduler pod assignment |
| configs | object | `{"confdFiles":null,"configdFiles":null,"files":null,"templatesdFiles":null,"usersdFiles":null}` | overrides operator default configmaps |
| fullnameOverride | string | `""` | full name of the chart. |
| imagePullSecrets | list | `[]` | image pull secret for private images |
| metrics.env | list | `[]` | additional environment variables for the deployment |
| metrics.image.pullPolicy | string | `"IfNotPresent"` | image pull policy |
| metrics.image.repository | string | `"altinity/metrics-exporter"` | image repository |
| metrics.image.tag | string | `""` | image tag (chart's appVersion value will be used if not set) |
| metrics.resources | object | `{}` | custom resource configuration |
| metrics.command | list | `nil` | command for metrics-exporter container |
| metrics.args | list | `nil` | args for metrics-exporter container |
| nameOverride | string | `""` | override name of the chart |
| nodeSelector | object | `{}` | node for scheduler pod assignment |
| operator.env | list | `[]` | additional environment variables for the deployment |
| operator.image.pullPolicy | string | `"IfNotPresent"` | image pull policy |
| operator.image.repository | string | `"altinity/clickhouse-operator"` | image repository |
| operator.image.tag | string | `""` | image tag (chart's appVersion value will be used if not set) |
| operator.resources | object | `{}` | custom resource configuration |
| operator.command | list | `nil` | command for operator container |
| operator.args | list | `nil` | args for operator container |
| podAnnotations | object | `nil` | additional pod annotations |
| serviceAccount.annotations | object | `{}` | annotations to add to the service account |
| serviceAccount.create | bool | `true` | specifies whether a service account should be created |
| serviceAccount.name | string | `nil` | the name of the service account to use; if not set and create is true, a name is generated using the fullname template |
| serviceMonitor.additionalLabels | object | `{}` | additional labels for service monitor |
| serviceMonitor.enabled | bool | `false` | ServiceMonitor CRD is created for a prometheus operator |
| tolerations | list | `[]` | tolerations for scheduler pod assignment |
