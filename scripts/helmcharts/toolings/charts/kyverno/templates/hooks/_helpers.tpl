{{/* vim: set filetype=mustache: */}}

{{- define "kyverno.hooks.labels" -}}
{{- template "kyverno.labels.merge" (list
  (include "kyverno.labels.common" .)
  (include "kyverno.hooks.matchLabels" .)
) -}}
{{- end -}}

{{- define "kyverno.hooks.matchLabels" -}}
{{- template "kyverno.labels.merge" (list
  (include "kyverno.matchLabels.common" .)
  (include "kyverno.labels.component" "hooks")
) -}}
{{- end -}}
