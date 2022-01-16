{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "kafka.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "kafka.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "kafka.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "kafka.labels" -}}
app.kubernetes.io/name: {{ include "kafka.name" . }}
helm.sh/chart: {{ include "kafka.chart" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Labels to use on deploy.spec.selector.matchLabels and svc.spec.selector
*/}}
{{- define "kafka.matchLabels" -}}
app.kubernetes.io/name: {{ include "kafka.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Create a default fully qualified zookeeper name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "kafka.zookeeper.fullname" -}}
{{- if .Values.zookeeper.fullnameOverride -}}
{{- .Values.zookeeper.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default "zookeeper" .Values.zookeeper.nameOverride -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
 Create the name of the service account to use
 */}}
{{- define "kafka.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "kafka.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Return the proper Kafka image name
*/}}
{{- define "kafka.image" -}}
{{- $registryName := .Values.image.registry -}}
{{- $repositoryName := .Values.image.repository -}}
{{- $tag := .Values.image.tag | toString -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 doesn't support it, so we need to implement this if-else logic.
Also, we can't use a single if because lazy evaluation is not an option
*/}}
{{- if .Values.global }}
    {{- if .Values.global.imageRegistry }}
        {{- printf "%s/%s:%s" .Values.global.imageRegistry $repositoryName $tag -}}
    {{- else -}}
        {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
    {{- end -}}
{{- else -}}
    {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- end -}}
{{- end -}}

{{/*
Return the proper image name (for the init container auto-discovery image)
*/}}
{{- define "kafka.externalAccess.autoDiscovery.image" -}}
{{- $registryName := .Values.externalAccess.autoDiscovery.image.registry -}}
{{- $repositoryName := .Values.externalAccess.autoDiscovery.image.repository -}}
{{- $tag := .Values.externalAccess.autoDiscovery.image.tag | toString -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 doesn't support it, so we need to implement this if-else logic.
Also, we can't use a single if because lazy evaluation is not an option
*/}}
{{- if .Values.global }}
    {{- if .Values.global.imageRegistry }}
        {{- printf "%s/%s:%s" .Values.global.imageRegistry $repositoryName $tag -}}
    {{- else -}}
        {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
    {{- end -}}
{{- else -}}
    {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- end -}}
{{- end -}}

{{/*
Return the proper image name (for the init container volume-permissions image)
*/}}
{{- define "kafka.volumePermissions.image" -}}
{{- $registryName := .Values.volumePermissions.image.registry -}}
{{- $repositoryName := .Values.volumePermissions.image.repository -}}
{{- $tag := .Values.volumePermissions.image.tag | toString -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 doesn't support it, so we need to implement this if-else logic.
Also, we can't use a single if because lazy evaluation is not an option
*/}}
{{- if .Values.global }}
    {{- if .Values.global.imageRegistry }}
        {{- printf "%s/%s:%s" .Values.global.imageRegistry $repositoryName $tag -}}
    {{- else -}}
        {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
    {{- end -}}
{{- else -}}
    {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- end -}}
{{- end -}}

{{/*
Return the proper Kafka exporter image name
*/}}
{{- define "kafka.metrics.kafka.image" -}}
{{- $registryName := .Values.metrics.kafka.image.registry -}}
{{- $repositoryName := .Values.metrics.kafka.image.repository -}}
{{- $tag := .Values.metrics.kafka.image.tag | toString -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 doesn't support it, so we need to implement this if-else logic.
Also, we can't use a single if because lazy evaluation is not an option
*/}}
{{- if .Values.global }}
    {{- if .Values.global.imageRegistry }}
        {{- printf "%s/%s:%s" .Values.global.imageRegistry $repositoryName $tag -}}
    {{- else -}}
        {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
    {{- end -}}
{{- else -}}
    {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- end -}}
{{- end -}}

{{/*
Return the proper JMX exporter image name
*/}}
{{- define "kafka.metrics.jmx.image" -}}
{{- $registryName := .Values.metrics.jmx.image.registry -}}
{{- $repositoryName := .Values.metrics.jmx.image.repository -}}
{{- $tag := .Values.metrics.jmx.image.tag | toString -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 doesn't support it, so we need to implement this if-else logic.
Also, we can't use a single if because lazy evaluation is not an option
*/}}
{{- if .Values.global }}
    {{- if .Values.global.imageRegistry }}
        {{- printf "%s/%s:%s" .Values.global.imageRegistry $repositoryName $tag -}}
    {{- else -}}
        {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
    {{- end -}}
{{- else -}}
    {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- end -}}
{{- end -}}

{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "kafka.imagePullSecrets" -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 does not support it, so we need to implement this if-else logic.
Also, we can not use a single if because lazy evaluation is not an option
*/}}
{{- if .Values.global }}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- else if or .Values.image.pullSecrets .Values.externalAccess.autoDiscovery.image.pullSecrets .Values.volumePermissions.image.pullSecrets .Values.metrics.kafka.image.pullSecrets .Values.metrics.jmx.image.pullSecrets }}
imagePullSecrets:
{{- range .Values.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.externalAccess.autoDiscovery.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.volumePermissions.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.metrics.kafka.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.metrics.jmx.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end -}}
{{- else if or .Values.image.pullSecrets .Values.externalAccess.autoDiscovery.image.pullSecrets .Values.volumePermissions.image.pullSecrets .Values.metrics.kafka.image.pullSecrets .Values.metrics.jmx.image.pullSecrets }}
imagePullSecrets:
{{- range .Values.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.externalAccess.autoDiscovery.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.volumePermissions.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.metrics.kafka.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.metrics.jmx.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end -}}
{{- end -}}

{{/*
Return the proper Storage Class
*/}}
{{- define "kafka.storageClass" -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 does not support it, so we need to implement this if-else logic.
*/}}
{{- if .Values.global -}}
    {{- if .Values.global.storageClass -}}
        {{- if (eq "-" .Values.global.storageClass) -}}
            {{- printf "storageClassName: \"\"" -}}
        {{- else }}
            {{- printf "storageClassName: %s" .Values.global.storageClass -}}
        {{- end -}}
    {{- else -}}
        {{- if .Values.persistence.storageClass -}}
              {{- if (eq "-" .Values.persistence.storageClass) -}}
                  {{- printf "storageClassName: \"\"" -}}
              {{- else }}
                  {{- printf "storageClassName: %s" .Values.persistence.storageClass -}}
              {{- end -}}
        {{- end -}}
    {{- end -}}
{{- else -}}
    {{- if .Values.persistence.storageClass -}}
        {{- if (eq "-" .Values.persistence.storageClass) -}}
            {{- printf "storageClassName: \"\"" -}}
        {{- else }}
            {{- printf "storageClassName: %s" .Values.persistence.storageClass -}}
        {{- end -}}
    {{- end -}}
{{- end -}}
{{- end -}}

{{/*
Return true if authentication via SASL should be configured for client communications
*/}}
{{- define "kafka.client.saslAuthentication" -}}
{{- $saslProtocols := list "sasl" "sasl_tls" -}}
{{- if has .Values.auth.clientProtocol $saslProtocols -}}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Return true if authentication via SASL should be configured for inter-broker communications
*/}}
{{- define "kafka.interBroker.saslAuthentication" -}}
{{- $saslProtocols := list "sasl" "sasl_tls" -}}
{{- if has .Values.auth.interBrokerProtocol $saslProtocols -}}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Return true if encryption via TLS should be configured
*/}}
{{- define "kafka.tlsEncryption" -}}
{{- $tlsProtocols := list "tls" "mtls" "sasl_tls" -}}
{{- if or (has .Values.auth.clientProtocol $tlsProtocols) (has .Values.auth.interBrokerProtocol $tlsProtocols) -}}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Return the type of listener
Usage:
{{ include "kafka.listenerType" ( dict "protocol" .Values.path.to.the.Value ) }}
*/}}
{{- define "kafka.listenerType" -}}
{{- if eq .protocol "plaintext" -}}
PLAINTEXT
{{- else if or (eq .protocol "tls") (eq .protocol "mtls") -}}
SSL
{{- else if eq .protocol "sasl_tls" -}}
SASL_SSL
{{- else if eq .protocol "sasl" -}}
SASL_PLAINTEXT
{{- end -}}
{{- end -}}

{{/*
Return the SASL type
Usage:
{{ include "kafka.auth.saslMechanisms" ( dict "type" .Values.path.to.the.Value ) }}
*/}}
{{- define "kafka.auth.saslMechanisms" -}}
{{- $mechanisms := list -}}
{{- if .type | regexFind "plain" -}}
{{- $mechanisms = append $mechanisms "PLAIN" -}}
{{- end -}}
{{- if .type | regexFind "scram-sha-256" -}}
{{- $mechanisms = append $mechanisms "SCRAM-SHA-256" -}}
{{- end -}}
{{- if .type | regexFind "scram-sha-512" -}}
{{- $mechanisms = append $mechanisms "SCRAM-SHA-512" -}}
{{- end -}}
{{- $mechanisms = join "," $mechanisms -}}
{{- printf "%s" $mechanisms -}}
{{- end -}}

{{/*
Return the Kafka JAAS credentials secret
*/}}
{{- define "kafka.jaasSecretName" -}}
{{- if .Values.auth.jaas.existingSecret -}}
    {{- printf "%s" (tpl .Values.auth.jaas.existingSecret $) -}}
{{- else -}}
    {{- printf "%s-jaas" (include "kafka.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Return true if a JAAS credentials secret object should be created
*/}}
{{- define "kafka.createJaasSecret" -}}
{{- if and (or (include "kafka.client.saslAuthentication" .) (include "kafka.interBroker.saslAuthentication" .) .Values.auth.jaas.zookeeperUser) (not .Values.auth.jaas.existingSecret) -}}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Return the Kafka JKS credentials secret
*/}}
{{- define "kafka.jksSecretName" -}}
{{- if .Values.auth.jksSecret -}}
    {{- printf "%s" (tpl .Values.auth.jksSecret $) -}}
{{- else -}}
    {{- printf "%s-jks" (include "kafka.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Return true if a JAAS credentials secret object should be created
*/}}
{{- define "kafka.createJksSecret" -}}
{{- if and (.Files.Glob "files/jks/*.jks") (not .Values.auth.jksSecret) }}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Return the Kafka configuration configmap
*/}}
{{- define "kafka.configmapName" -}}
{{- if .Values.existingConfigmap -}}
    {{- printf "%s" (tpl .Values.existingConfigmap $) -}}
{{- else -}}
    {{- printf "%s-configuration" (include "kafka.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Return true if a configmap object should be created
*/}}
{{- define "kafka.createConfigmap" -}}
{{- if and .Values.config (not .Values.existingConfigmap) }}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Return the Kafka log4j ConfigMap name.
*/}}
{{- define "kafka.log4j.configMapName" -}}
{{- if .Values.existingLog4jConfigMap -}}
    {{- printf "%s" (tpl .Values.existingLog4jConfigMap $) -}}
{{- else -}}
    {{- printf "%s-log4j-configuration" (include "kafka.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Return true if a log4j ConfigMap object should be created.
*/}}
{{- define "kafka.log4j.createConfigMap" -}}
{{- if and .Values.log4j (not .Values.existingLog4jConfigMap) }}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Return the Kafka configuration configmap
*/}}
{{- define "kafka.metrics.jmx.configmapName" -}}
{{- if .Values.metrics.jmx.existingConfigmap -}}
    {{- printf "%s" (tpl .Values.metrics.jmx.existingConfigmap $) -}}
{{- else -}}
    {{- printf "%s-jmx-configuration" (include "kafka.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Return true if a configmap object should be created
*/}}
{{- define "kafka.metrics.jmx.createConfigmap" -}}
{{- if and .Values.metrics.jmx.enabled .Values.metrics.jmx.config (not .Values.metrics.jmx.existingConfigmap) }}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Renders a value that contains template.
Usage:
{{ include "kafka.tplValue" ( dict "value" .Values.path.to.the.Value "context" $) }}
*/}}
{{- define "kafka.tplValue" -}}
    {{- if typeIs "string" .value }}
        {{- tpl .value .context }}
    {{- else }}
        {{- tpl (.value | toYaml) .context }}
    {{- end }}
{{- end -}}

{{/*
Check if there are rolling tags in the images
*/}}
{{- define "kafka.checkRollingTags" -}}
{{- if and (contains "bitnami/" .Values.image.repository) (not (.Values.image.tag | toString | regexFind "-r\\d+$|sha256:")) }}
WARNING: Rolling tag detected ({{ .Values.image.repository }}:{{ .Values.image.tag }}), please note that it is strongly recommended to avoid using rolling tags in a production environment.
+info https://docs.bitnami.com/containers/how-to/understand-rolling-tags-containers/
{{- end }}
{{- if and (contains "bitnami/" .Values.externalAccess.autoDiscovery.image.repository) (not (.Values.externalAccess.autoDiscovery.image.tag | toString | regexFind "-r\\d+$|sha256:")) }}
WARNING: Rolling tag detected ({{ .Values.externalAccess.autoDiscovery.image.repository }}:{{ .Values.externalAccess.autoDiscovery.image.tag }}), please note that it is strongly recommended to avoid using rolling tags in a production environment.
+info https://docs.bitnami.com/containers/how-to/understand-rolling-tags-containers/
{{- end }}
{{- if and (contains "bitnami/" .Values.metrics.kafka.image.repository) (not (.Values.metrics.kafka.image.tag | toString | regexFind "-r\\d+$|sha256:")) }}
WARNING: Rolling tag detected ({{ .Values.metrics.kafka.image.repository }}:{{ .Values.metrics.kafka.image.tag }}), please note that it is strongly recommended to avoid using rolling tags in a production environment.
+info https://docs.bitnami.com/containers/how-to/understand-rolling-tags-containers/
{{- end }}
{{- if and (contains "bitnami/" .Values.metrics.jmx.image.repository) (not (.Values.metrics.jmx.image.tag | toString | regexFind "-r\\d+$|sha256:")) }}
WARNING: Rolling tag detected ({{ .Values.metrics.jmx.image.repository }}:{{ .Values.metrics.jmx.image.tag }}), please note that it is strongly recommended to avoid using rolling tags in a production environment.
+info https://docs.bitnami.com/containers/how-to/understand-rolling-tags-containers/
{{- end }}
{{- end -}}

{{/*
Compile all warnings into a single message, and call fail.
*/}}
{{- define "kafka.validateValues" -}}
{{- $messages := list -}}
{{- $messages := append $messages (include "kafka.validateValues.authProtocols" .) -}}
{{- $messages := append $messages (include "kafka.validateValues.nodePortListLength" .) -}}
{{- $messages := append $messages (include "kafka.validateValues.externalAccessServiceType" .) -}}
{{- $messages := append $messages (include "kafka.validateValues.externalAccessAutoDiscoveryRBAC" .) -}}
{{- $messages := append $messages (include "kafka.validateValues.jksSecret" .) -}}
{{- $messages := append $messages (include "kafka.validateValues.saslMechanisms" .) -}}
{{- $messages := without $messages "" -}}
{{- $message := join "\n" $messages -}}

{{- if $message -}}
{{-   printf "\nVALUES VALIDATION:\n%s" $message | fail -}}
{{- end -}}
{{- end -}}

{{/* Validate values of Kafka - Authentication protocols for Kafka */}}
{{- define "kafka.validateValues.authProtocols" -}}
{{- $authProtocols := list "plaintext" "tls" "mtls" "sasl" "sasl_tls" -}}
{{- if or (not (has .Values.auth.clientProtocol $authProtocols)) (not (has .Values.auth.interBrokerProtocol $authProtocols)) -}}
kafka: auth.clientProtocol auth.interBrokerProtocol
    Available authentication protocols are "plaintext", "tls", "mtls", "sasl" and "sasl_tls"
{{- end -}}
{{- end -}}

{{/* Validate values of Kafka - number of replicas must be the same than NodePort list */}}
{{- define "kafka.validateValues.nodePortListLength" -}}
{{- $replicaCount := int .Values.replicaCount }}
{{- $nodePortListLength := len .Values.externalAccess.service.nodePorts }}
{{- if and .Values.externalAccess.enabled (not .Values.externalAccess.autoDiscovery.enabled) (not (eq $replicaCount $nodePortListLength )) (eq .Values.externalAccess.service.type "NodePort") -}}
kafka: .Values.externalAccess.service.nodePorts
    Number of replicas and nodePort array length must be the same. Currently: replicaCount = {{ $replicaCount }} and nodePorts = {{ $nodePortListLength }}
{{- end -}}
{{- end -}}

{{/* Validate values of Kafka - service type for external access */}}
{{- define "kafka.validateValues.externalAccessServiceType" -}}
{{- if and (not (eq .Values.externalAccess.service.type "NodePort")) (not (eq .Values.externalAccess.service.type "LoadBalancer")) -}}
kafka: externalAccess.service.type
    Available servive type for external access are NodePort or LoadBalancer.
{{- end -}}
{{- end -}}

{{/* Validate values of Kafka - RBAC should be enabled when autoDiscovery is enabled */}}
{{- define "kafka.validateValues.externalAccessAutoDiscoveryRBAC" -}}
{{- if and .Values.externalAccess.enabled .Values.externalAccess.autoDiscovery.enabled (not .Values.rbac.create )}}
kafka: rbac.create
    By specifying "externalAccess.enabled=true" and "externalAccess.autoDiscovery.enabled=true"
    an initContainer will be used to autodetect the external IPs/ports by querying the
    K8s API. Please note this initContainer requires specific RBAC resources. You can create them
    by specifying "--set rbac.create=true".
{{- end -}}
{{- end -}}

{{/* Validate values of Kafka - A secret containing JKS files must be provided when TLS authentication is enabled */}}
{{- define "kafka.validateValues.jksSecret" -}}
{{- if and (include "kafka.tlsEncryption" .) (not .Values.auth.jksSecret) (not (.Files.Glob "files/jks/*.jks")) }}
kafka: auth.jksSecret
    A secret containing the Kafka JKS files is required when TLS encryption in enabled
{{- end -}}
{{- end -}}

{{/* Validate values of Kafka - SASL mechanisms must be provided when using SASL */}}
{{- define "kafka.validateValues.saslMechanisms" -}}
{{- if and (or (.Values.auth.clientProtocol | regexFind "sasl") (.Values.auth.interBrokerProtocol | regexFind "sasl") .Values.auth.jaas.zookeeperUser) (not .Values.auth.saslMechanisms) }}
kafka: auth.saslMechanisms
    The SASL mechanisms are required when either auth.clientProtocol or auth.interBrokerProtocol use SASL or Zookeeper user is provided.
{{- end }}
{{- if not (contains .Values.auth.saslInterBrokerMechanism .Values.auth.saslMechanisms) }}
kafka: auth.saslMechanisms
    auth.saslInterBrokerMechanism must be provided and it should be one of the specified mechanisms at auth.saslMechanisms
{{- end -}}
{{- end -}}
