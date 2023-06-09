{{/* vim: set filetype=mustache: */}}

{{- define "kyverno.config.configMapName" -}}
{{- if .Values.config.create -}}
    {{ default (include "kyverno.fullname" .) .Values.config.name }}
{{- else -}}
    {{ required "A configmap name is required when `config.create` is set to `false`" .Values.config.name }}
{{- end -}}
{{- end -}}

{{- define "kyverno.config.metricsConfigMapName" -}}
{{- if .Values.metricsConfig.create -}}
    {{ default (printf "%s-metrics" (include "kyverno.fullname" .)) .Values.metricsConfig.name }}
{{- else -}}
    {{ required "A configmap name is required when `metricsConfig.create` is set to `false`" .Values.metricsConfig.name }}
{{- end -}}
{{- end -}}

{{- define "kyverno.config.labels" -}}
{{- template "kyverno.labels.merge" (list
  (include "kyverno.labels.common" .)
  (include "kyverno.config.matchLabels" .)
) -}}
{{- end -}}

{{- define "kyverno.config.matchLabels" -}}
{{- template "kyverno.labels.merge" (list
  (include "kyverno.matchLabels.common" .)
  (include "kyverno.labels.component" "config")
) -}}
{{- end -}}

{{- define "kyverno.config.resourceFilters" -}}
{{- $resourceFilters := .Values.config.resourceFilters -}}
{{- if .Values.config.excludeKyvernoNamespace -}}
  {{- $resourceFilters = prepend .Values.config.resourceFilters (printf "[*/*,%s,*]" (include "kyverno.namespace" .)) -}}
{{- end -}}
{{- range $exclude := .Values.config.resourceFiltersExcludeNamespaces -}}
  {{- range $filter := $resourceFilters -}}
    {{- if (contains (printf ",%s," $exclude) $filter) -}}
      {{- $resourceFilters = without $resourceFilters $filter -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- range $resourceFilter := $resourceFilters }}
{{ tpl $resourceFilter $ }}
{{- end -}}
{{- end -}}

{{- define "kyverno.config.webhooks" -}}
{{- $excludeDefault := dict "key" "kubernetes.io/metadata.name" "operator" "NotIn" "values" (list (include "kyverno.namespace" .)) }}
{{- $newWebhook := list }}
{{- range $webhook := .Values.config.webhooks }}
  {{- $namespaceSelector := default dict $webhook.namespaceSelector }}
  {{- $matchExpressions := default list $namespaceSelector.matchExpressions }}
  {{- $newNamespaceSelector := dict "matchLabels" $namespaceSelector.matchLabels "matchExpressions" (append $matchExpressions $excludeDefault) }}
  {{- $newWebhook = append $newWebhook (merge (omit $webhook "namespaceSelector") (dict "namespaceSelector" $newNamespaceSelector)) }}
{{- end }}
{{- $newWebhook | toJson }}
{{- end -}}

{{- define "kyverno.config.imagePullSecret" -}}
{{- printf "{\"auths\":{\"%s\":{\"auth\":\"%s\"}}}" .registry (printf "%s:%s" .username .password | b64enc) | b64enc }}
{{- end -}}
