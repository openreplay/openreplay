{{- $excludedKeys := list "POD_NAMESPACE" -}}
{{ range (index .Values.spec.template.spec.containers 0).env -}}
{{- if not (has .name $excludedKeys) -}}
{{ .name }}="{{ .value }}"
{{ end -}}
{{ end -}}
