{{/* vim: set filetype=mustache: */}}

{{- define "kyverno.templating.labels" -}}
{{- template "kyverno.labels.merge" (list
  (include "kyverno.labels.common" .)
  (include "kyverno.matchLabels.common" .)
) -}}
{{- end -}}
