{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "altinity-clickhouse-operator.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "altinity-clickhouse-operator.fullname" -}}
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
{{- define "altinity-clickhouse-operator.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "altinity-clickhouse-operator.labels" -}}
helm.sh/chart: {{ include "altinity-clickhouse-operator.chart" . }}
{{ include "altinity-clickhouse-operator.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "altinity-clickhouse-operator.selectorLabels" -}}
app.kubernetes.io/name: {{ include "altinity-clickhouse-operator.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "altinity-clickhouse-operator.serviceAccountName" -}}
    {{ default (include "altinity-clickhouse-operator.fullname" .) .Values.serviceAccount.name }}
{{- end -}}

{{/*
Create the tag for the docker image to use
*/}}
{{- define "altinity-clickhouse-operator.operator.tag" -}}
{{- .Values.operator.image.tag | default .Chart.AppVersion -}}
{{- end -}}

{{/*
Create the tag for the docker image to use
*/}}
{{- define "altinity-clickhouse-operator.metrics.tag" -}}
{{- .Values.metrics.image.tag | default .Chart.AppVersion -}}
{{- end -}}
