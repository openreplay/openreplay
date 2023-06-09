{{/* vim: set filetype=mustache: */}}

{{- define "kyverno.reports-controller.name" -}}
{{ template "kyverno.name" . }}-reports-controller
{{- end -}}

{{- define "kyverno.reports-controller.labels" -}}
{{- template "kyverno.labels.merge" (list
  (include "kyverno.labels.common" .)
  (include "kyverno.reports-controller.matchLabels" .)
) -}}
{{- end -}}

{{- define "kyverno.reports-controller.matchLabels" -}}
{{- template "kyverno.labels.merge" (list
  (include "kyverno.matchLabels.common" .)
  (include "kyverno.labels.component" "reports-controller")
) -}}
{{- end -}}

{{- define "kyverno.reports-controller.image" -}}
{{- if .image.registry -}}
  {{ .image.registry }}/{{ required "An image repository is required" .image.repository }}:{{ default .defaultTag .image.tag }}
{{- else -}}
  {{ required "An image repository is required" .image.repository }}:{{ default .defaultTag .image.tag }}
{{- end -}}
{{- end -}}

{{- define "kyverno.reports-controller.roleName" -}}
{{ include "kyverno.fullname" . }}:reports-controller
{{- end -}}

{{- define "kyverno.reports-controller.serviceAccountName" -}}
{{- if .Values.reportsController.rbac.create -}}
    {{ default (include "kyverno.reports-controller.name" .) .Values.reportsController.rbac.serviceAccount.name }}
{{- else -}}
    {{ required "A service account name is required when `rbac.create` is set to `false`" .Values.reportsController.rbac.serviceAccount.name }}
{{- end -}}
{{- end -}}
