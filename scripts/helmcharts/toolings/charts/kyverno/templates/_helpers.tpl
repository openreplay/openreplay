{{/* vim: set filetype=mustache: */}}

{{/* Expand the name of the chart. */}}
{{- define "kyverno.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "kyverno.fullname" -}}
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

{{/* Create chart name and version as used by the chart label. */}}
{{- define "kyverno.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Helm labels */}}
{{- define "kyverno.helmLabels" -}}
{{- if not .Values.templating.enabled -}}
helm.sh/chart: {{ template "kyverno.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}
{{- end -}}

{{/* Version labels */}}
{{- define "kyverno.versionLabels" -}}
{{- if .Values.templating.enabled -}}
app.kubernetes.io/version: {{ required "templating.version is required when templating.enabled is true" .Values.templating.version | replace "+" "_" }}
{{- else -}}
app.kubernetes.io/version: {{ .Chart.Version | replace "+" "_" }}
{{- end -}}
{{- end -}}

{{/* CRD labels */}}
{{- define "kyverno.crdLabels" -}}
app.kubernetes.io/component: kyverno
{{- with (include "kyverno.helmLabels" .) }}
{{ . }}
{{- end }}
{{- with (include "kyverno.matchLabels" .) }}
{{ . }}
{{- end }}
app.kubernetes.io/part-of: {{ template "kyverno.name" . }}
{{- with (include "kyverno.versionLabels" .) }}
{{ . }}
{{- end }}
{{- end -}}

{{/* Helm required labels */}}
{{- define "kyverno.labels" -}}
app.kubernetes.io/component: kyverno
{{- with (include "kyverno.helmLabels" .) }}
{{ . }}
{{- end }}
{{- with (include "kyverno.matchLabels" .) }}
{{ . }}
{{- end }}
app.kubernetes.io/part-of: {{ template "kyverno.name" . }}
{{- with (include "kyverno.versionLabels" .) }}
{{ . }}
{{- end }}
{{- if .Values.customLabels }}
{{ toYaml .Values.customLabels }}
{{- end }}
{{- end -}}

{{/* Helm required labels */}}
{{- define "kyverno.test-labels" -}}
{{- with (include "kyverno.helmLabels" .) }}
{{ . }}
{{- end }}
app: kyverno
app.kubernetes.io/component: kyverno
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/name: {{ template "kyverno.name" . }}-test
app.kubernetes.io/part-of: {{ template "kyverno.name" . }}
app.kubernetes.io/version: "{{ .Chart.Version | replace "+" "_" }}"
{{- end -}}

{{/* matchLabels */}}
{{- define "kyverno.matchLabels" -}}
{{- if .Values.templating.enabled -}}
app: kyverno
{{- end }}
app.kubernetes.io/name: {{ template "kyverno.name" . }}
{{- if not .Values.templating.enabled }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
{{- end -}}

{{/* Get the config map name. */}}
{{- define "kyverno.configMapName" -}}
{{- printf "%s" (default (include "kyverno.fullname" .) .Values.config.existingConfig) -}}
{{- end -}}

{{/* Get the metrics config map name. */}}
{{- define "kyverno.metricsConfigMapName" -}}
{{- printf "%s" (default (printf "%s-metrics" (include "kyverno.fullname" .)) .Values.config.existingMetricsConfig) -}}
{{- end -}}

{{/* Get the namespace name. */}}
{{- define "kyverno.namespace" -}}
{{- if .Values.namespace -}}
    {{- .Values.namespace -}}
{{- else -}}
    {{- .Release.Namespace -}}
{{- end -}}
{{- end -}}

{{/* Create the name of the service to use */}}
{{- define "kyverno.serviceName" -}}
{{- printf "%s-svc" (include "kyverno.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Create the name of the service account to use */}}
{{- define "kyverno.serviceAccountName" -}}
{{- if .Values.rbac.serviceAccount.create -}}
    {{ default (include "kyverno.fullname" .) .Values.rbac.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.rbac.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/* Create the default PodDisruptionBudget to use */}}
{{- define "kyverno.podDisruptionBudget.spec" -}}
{{- if and .Values.podDisruptionBudget.minAvailable .Values.podDisruptionBudget.maxUnavailable }}
{{- fail "Cannot set both .Values.podDisruptionBudget.minAvailable and .Values.podDisruptionBudget.maxUnavailable" -}}
{{- end }}
{{- if not .Values.podDisruptionBudget.maxUnavailable }}
minAvailable: {{ default 1 .Values.podDisruptionBudget.minAvailable }}
{{- end }}
{{- if .Values.podDisruptionBudget.maxUnavailable }}
maxUnavailable: {{ .Values.podDisruptionBudget.maxUnavailable }}
{{- end }}
{{- end }}

{{- define "kyverno.securityContext" -}}
{{- if semverCompare "<1.19" .Capabilities.KubeVersion.Version }}
{{ toYaml (omit .Values.securityContext "seccompProfile") }}
{{- else }}
{{ toYaml .Values.securityContext }}
{{- end }}
{{- end }}

{{- define "kyverno.testSecurityContext" -}}
{{- if semverCompare "<1.19" .Capabilities.KubeVersion.Version }}
{{ toYaml (omit .Values.testSecurityContext "seccompProfile") }}
{{- else }}
{{ toYaml .Values.testSecurityContext }}
{{- end }}
{{- end }}

{{- define "kyverno.imagePullSecret" }}
{{- printf "{\"auths\":{\"%s\":{\"auth\":\"%s\"}}}" .registry (printf "%s:%s" .username .password | b64enc) | b64enc }}
{{- end }}

{{- define "kyverno.image" -}}
  {{- if .image.registry -}}
{{ .image.registry }}/{{ required "An image repository is required" .image.repository }}:{{ default .defaultTag .image.tag }}
  {{- else -}}
{{ required "An image repository is required" .image.repository }}:{{ default .defaultTag .image.tag }}
  {{- end -}}
{{- end }}

{{- define "kyverno.resourceFilters" -}}
{{- $resourceFilters := .Values.config.resourceFilters }}
{{- if .Values.excludeKyvernoNamespace }}
  {{- $resourceFilters = prepend .Values.config.resourceFilters (printf "[*,%s,*]" (include "kyverno.namespace" .)) }}
{{- end }}
{{- range $exclude := .Values.resourceFiltersExcludeNamespaces }}
  {{- range $filter := $resourceFilters }}
    {{- if (contains (printf ",%s," $exclude) $filter) }}
      {{- $resourceFilters = without $resourceFilters $filter }}
    {{- end }}
  {{- end }}
{{- end }}
{{- tpl (join "" $resourceFilters) . }}
{{- end }}

{{- define "kyverno.webhooks" -}}
{{- $excludeDefault := dict "key" "kubernetes.io/metadata.name" "operator" "NotIn" "values" (list (include "kyverno.namespace" .)) }}
{{- $newWebhook := list }}
{{- range $webhook := .Values.config.webhooks }}
  {{- $namespaceSelector := default dict $webhook.namespaceSelector }}
  {{- $matchExpressions := default list $namespaceSelector.matchExpressions }}
  {{- $newNamespaceSelector := dict "matchLabels" $namespaceSelector.matchLabels "matchExpressions" (append $matchExpressions $excludeDefault) }}
  {{- $newWebhook = append $newWebhook (merge (omit $webhook "namespaceSelector") (dict "namespaceSelector" $newNamespaceSelector)) }}
{{- end }}
{{- $newWebhook | toJson }}
{{- end }}
