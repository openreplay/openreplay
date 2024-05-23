{{/*
Expand the name of the chart.
*/}}
{{- define "connector.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "connector.fullname" -}}
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
{{- define "connector.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "connector.labels" -}}
helm.sh/chart: {{ include "connector.chart" . }}
{{ include "connector.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "connector.selectorLabels" -}}
app.kubernetes.io/name: {{ include "connector.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "connector.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "connector.fullname" .) .Values.serviceAccount.name }}
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
