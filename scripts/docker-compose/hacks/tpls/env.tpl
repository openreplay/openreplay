{{- $excludedKeys := list "POD_NAMESPACE" -}}
{{ range (index .Values.spec.template.spec.containers 0).env -}}
{{- if not (has .name $excludedKeys) -}}
{{ .name }}="{{ if eq .value "<no value>" }}{{ else }}{{ .value }}{{ end }}"
{{ end -}}
{{ end -}}
