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
{{- if contains "minio" .Values.global.s3.endpoint -}}
{{- include "openreplay.domainURL" . -}}
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
{{- if .enabled }}
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

{{/*
Retrieve secret values from Kubernetes secrets if available, otherwise use default values specified in values.yaml.
*/}}
{{- define "chart.secretValueOrDefault" -}}
{{- $secretName := .Release.Name | printf "%s-external-secrets" -}}
{{- $envVar := index .Values.global.env .name -}}
{{- $key := $envVar.key -}}
{{- $default := $envVar.default -}}
{{- if $key -}}
- name: {{ .name }}
  valueFrom:
    secretKeyRef:
      name: {{ $secretName }}
      key: {{ $key }}
{{- else -}}
- name: {{ .name }}
  value: {{ $default | quote }}
{{- end }}
{{- end }}
