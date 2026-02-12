{{/*
Expand the name of the chart.
*/}}
{{- define "openreplay.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Get domain name with/without port */}}
{{- define "openreplay.domainURL" -}}
{{- $scheme := ternary "https" "http" .Values.global.ORSecureAccess -}}
{{- $internalPort := ternary .Values.global.ingress.controller.service.ports.https .Values.global.ingress.controller.service.ports.http .Values.global.ORSecureAccess -}}
{{/* If you're running OR behind proxy
ingress-nginx: &ingress-nginx
  externalProxyPorts:
    http: 80
    https: 443
*/}}
{{- $externalPort := $internalPort -}}
{{- if .Values.global.ingress.externalProxyPorts }}
{{- $externalPort = ternary .Values.global.ingress.externalProxyPorts.https .Values.global.ingress.externalProxyPorts.http .Values.global.ORSecureAccess -}}
{{- end }}
{{- $port := toString $externalPort -}}
{{- if or (eq $port "80") (eq $port "443") -}}
{{- printf "%s://%s" $scheme .Values.global.domainName -}}
{{- else -}}
{{- printf "%s://%s:%s" $scheme .Values.global.domainName $port -}}
{{- end -}}
{{- end -}}

{{/* Get the S3 endpoint value */}}
{{- define "openreplay.s3Endpoint" -}}
{{- if .Values.global.s3.endpoint -}}
  {{- if contains "minio" .Values.global.s3.endpoint -}}
    {{- include "openreplay.domainURL" . -}}
  {{- else -}}
    {{-  .Values.global.s3.endpoint -}}
  {{- end -}}
{{/* Endpoint wil be empty if used with aws iam roles*/}}
{{- else if and .Values.global.s3.accessKey .Values.global.s3.secretKey -}}
  {{- printf "https://s3.%s.amazonaws.com" .Values.global.s3.region -}}
{{- else -}}
  {{- .Values.global.s3.endpoint -}}
{{- end -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "openreplay.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "openreplay.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "openreplay.labels" -}}
helm.sh/chart: {{ include "openreplay.chart" . }}
{{ include "openreplay.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Values.global.appLabels }}
{{- .Values.global.appLabels | toYaml | nindent 0}}
{{- end}}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "openreplay.selectorLabels" -}}
app.kubernetes.io/name: {{ include "openreplay.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "openreplay.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "openreplay.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the environment configuration for REDIS_STRING
*/}}
{{- define "openreplay.env.redis_string" -}}
{{- $scheme := (eq (.tls | default dict).enabled true) | ternary "rediss" "redis" -}}
{{- $auth := "" -}}
{{- if or .existingSecret .redisPassword -}}
  {{- $auth = printf "%s:$(REDIS_PASSWORD)@" (.redisUsername | default "") -}}
{{- end -}}
{{- if .existingSecret -}}
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .existingSecret }}
      key: redis-password
{{- else if .redisPassword }}
- name: REDIS_PASSWORD
  value: {{ .redisPassword }}
{{- end}}
- name: REDIS_STRING
  value: '{{ $scheme }}://{{ $auth }}{{ .redisHost }}:{{ .redisPort }}'
{{- end }}

{{/*
Create the volume mount config for redis TLS certificates
*/}}
{{- define "openreplay.volume.redis_ca_certificate" -}}
{{- if and ((.tls | default dict).enabled) (.tls.certificatesSecret) (.tls.certCAFilename) -}}
- name: redis-ca-certificate
  secret:
    secretName: {{ .tls.certificatesSecret }}
{{- end }}
{{- end }}

{{- define "openreplay.volume.redis_ca_certificate.mount" -}}
{{- if and ((.tls |default dict).enabled) (.tls.certificatesSecret) (.tls.certCAFilename) -}}
- name: redis-ca-certificate
  mountPath: /etc/ssl/certs/redis-ca-certificate.pem
  subPath: {{ .tls.certCAFilename }}
{{- end }}
{{- end }}

{{- define "openreplay.assets_origin"}}
{{- if .Values.global.assetsOrigin }}
{{- .Values.global.assetsOrigin | trimSuffix "/" }}
{{- else }}
{{- include "openreplay.s3Endpoint" . | trimSuffix "/" }}/{{.Values.global.s3.assetsBucket}}
{{- end }}
{{- end }}

{{- define "openreplay.pg_connection_string"}}
{{- if .Values.global.pg_connection_string }}
{{- .Values.global.pg_connection_string -}}
{{- else -}}
{{- printf "postgres://%s:$(pg_password)@%s:%s/%s" .Values.global.postgresql.postgresqlUser .Values.global.postgresql.postgresqlHost .Values.global.postgresql.postgresqlPort .Values.global.postgresql.postgresqlDatabase -}}
{{- end -}}
{{- end}}

{{- define "openreplay.assist_url"}}
{{- if .Values.global.enterpriseEditionLicense }}
{{- printf "http://assist-api-openreplay.%s.%s:9001/assist/%%s" .Release.Namespace  .Values.global.clusterDomain }}
{{- else}}
{{- printf "http://assist-openreplay.%s.%s:9001/assist/%%s" .Release.Namespace .Values.global.clusterDomain }}
{{- end}}
{{- end}}

{{- /*
{{- include "openreplay.secrets" (dict "key" "postgresql-password" "ctx" .) | nindent 4 }}
{{- include "openreplay.secrets" (dict "key" "clickhouse-password" "ctx" .) | nindent 4 }}
{{- include "openreplay.secrets" (dict "key" "access-key" "ctx" .) | nindent 4 }}
{{- include "openreplay.secrets" (dict "key" "secret-key" "ctx" .) | nindent 4 }}
{{- include "openreplay.secrets" (dict "key" "assist-key" "ctx" .) | nindent 4 }}
*/ -}}
{{- define "openreplay.secrets" -}}
{{- $secretName := "" -}}
{{- $secretKey := .key -}}
{{- if or (eq $secretKey "postgresql-password") -}}
{{- $secretName = .ctx.Values.global.postgresql.existingSecret | default "or-secrets" -}}
{{- $secretKey = .ctx.Values.global.postgresql.existingSecretPasswordKey | default "postgresql-password" -}}
{{- else if eq $secretKey "clickhouse-password" -}}
{{- $secretName = .ctx.Values.global.clickhouse.existingSecret | default "or-secrets" -}}
{{- $secretKey = .ctx.Values.global.clickhouse.existingSecretPasswordKey | default "clickhouse-password" -}}
{{- else if or (eq .key "access-key") (eq .key "secret-key") -}}
{{- $secretName = .ctx.Values.global.s3.existingSecret | default "or-secrets" -}}
{{- else -}}
{{- $secretName = .ctx.Values.global.orAppSecrets.existingSecret | default "or-secrets" -}}
{{- end -}}
name: {{ $secretName }}
key: {{ $secretKey }}
{{- if eq .key "license-key" }}
optional: true
{{- end }}
{{- end}}

{{- /*
{{- include "openreplay.env" (dict "ctx" . "skippedKeys" list("KEY1" "KEY2"))}}
*/}}
{{- define "openreplay.env" -}}
{{- $ctx := .ctx -}}
{{- $skippedKeys := .skippedKeys | default list -}}
{{- $mergedEnv := merge $ctx.Values.env $ctx.Values.global.env -}}
{{- range $key, $val := $mergedEnv }}
{{- if not (has $key $skippedKeys) }}
- name: {{ $key }}
  value: '{{ $val }}'
{{- end -}}
{{- end}}
{{- end}}

{{/*
Add hostAliases configuration to pod spec
Usage: {{- include "openreplay.pod.hostAliases" . | nindent 6 }}
*/}}
{{- define "openreplay.pod.hostAliases" -}}
{{- with .Values.hostAliases }}
hostAliases:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}

{{- /*
Check if enterprise edition is enabled by checking if license exists.
Usage: {{- if include "openreplay.isEnterprise" . }}
*/ -}}
{{- define "openreplay.isEnterprise" -}}
{{- if .Values.global.enterpriseEditionLicense -}}
true
{{- end -}}
{{- end -}}
