{{/* vim: set filetype=mustache: */}}

{{- define "kyverno.image" -}}
{{- $tag := default .defaultTag .image.tag -}}
{{- if not (typeIs "string" $tag) -}}
  {{ fail "Image tags must be strings." }}
{{- end -}}
{{- if .image.registry -}}
  {{- print .image.registry "/" (required "An image repository is required" .image.repository) ":" $tag -}}
{{- else -}}
  {{- print (required "An image repository is required" .image.repository) ":" $tag -}}
{{- end -}}
{{- end -}}
