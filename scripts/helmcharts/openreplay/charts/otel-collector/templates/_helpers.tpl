{{/*
Expand the name of the chart.
*/}}
{{- define "otel-collector.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "otel-collector.fullname" -}}
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
{{- define "otel-collector.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "otel-collector.labels" -}}
helm.sh/chart: {{ include "otel-collector.chart" . }}
{{ include "otel-collector.selectorLabels" . }}
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
{{- define "otel-collector.selectorLabels" -}}
app.kubernetes.io/name: {{ include "otel-collector.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "otel-collector.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "otel-collector.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Selector labels of the writer half (Kafka -> ClickHouse)
*/}}
{{- define "otel-collector.writerSelectorLabels" -}}
app.kubernetes.io/name: {{ include "otel-collector.name" . | trunc 56 | trimSuffix "-" }}-writer
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "otel-collector.writerFullname" -}}
{{ include "otel-collector.fullname" . | trunc 56 | trimSuffix "-" }}-writer
{{- end }}

{{- define "otel-collector.kafkaEnv" -}}
- name: OTLP_KAFKA_BROKERS
  value: '{{ .Values.global.kafka.kafkaHost }}:{{ .Values.global.kafka.kafkaPort }}'
- name: OTLP_KAFKA_TLS_INSECURE
  value: '{{ ne (toString .Values.global.kafka.kafkaUseSsl) "true" }}'
{{- end }}

{{- define "otel-collector.clickhouseEnv" -}}
- name: OTLP_CLICKHOUSE_ENDPOINT
  value: 'tcp://{{ .Values.global.clickhouse.chHost }}:{{ .Values.global.clickhouse.service.dataPort }}{{ if .Values.global.clickhouse.use_tls }}?secure=true{{ end }}'
- name: OTLP_CLICKHOUSE_USER
  value: '{{ .Values.clickhouse.username | default .Values.global.clickhouse.username }}'
- name: OTLP_CLICKHOUSE_PASSWORD
  valueFrom:
    secretKeyRef: {{- include "openreplay.secrets" (dict "key" "clickhouse-password" "ctx" .) | nindent 6 }}
{{- end }}
