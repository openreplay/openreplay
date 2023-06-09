{{/* vim: set filetype=mustache: */}}

{{- define "kyverno.admission-controller.name" -}}
{{ template "kyverno.name" . }}-admission-controller
{{- end -}}

{{- define "kyverno.admission-controller.labels" -}}
{{- template "kyverno.labels.merge" (list
  (include "kyverno.labels.common" .)
  (include "kyverno.admission-controller.matchLabels" .)
) -}}
{{- end -}}

{{- define "kyverno.admission-controller.matchLabels" -}}
{{- template "kyverno.labels.merge" (list
  (include "kyverno.matchLabels.common" .)
  (include "kyverno.labels.component" "admission-controller")
) -}}
{{- end -}}

{{- define "kyverno.admission-controller.roleName" -}}
{{ include "kyverno.fullname" . }}:admission-controller
{{- end -}}

{{- define "kyverno.admission-controller.serviceAccountName" -}}
{{- if .Values.admissionController.rbac.create -}}
    {{ default (include "kyverno.admission-controller.name" .) .Values.admissionController.rbac.serviceAccount.name }}
{{- else -}}
    {{ required "A service account name is required when `rbac.create` is set to `false`" .Values.admissionController.rbac.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{- define "kyverno.admission-controller.serviceName" -}}
{{- printf "%s-svc" (include "kyverno.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
