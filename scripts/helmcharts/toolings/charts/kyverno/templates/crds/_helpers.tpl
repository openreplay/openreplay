{{/* vim: set filetype=mustache: */}}

{{- define "kyverno.crds.labels" -}}
{{- template "kyverno.labels.merge" (list
  (include "kyverno.labels.common" .)
  (include "kyverno.crds.matchLabels" .)
) -}}
{{- end -}}

{{- define "kyverno.crds.matchLabels" -}}
{{- template "kyverno.labels.merge" (list
  (include "kyverno.matchLabels.common" .)
  (include "kyverno.labels.component" "crds")
) -}}
{{- end -}}
