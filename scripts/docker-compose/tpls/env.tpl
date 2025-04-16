{{ range (index .Values.spec.template.spec.containers 0).env -}}
{{ .name }}: "{{ .value }}"
{{ end -}}
