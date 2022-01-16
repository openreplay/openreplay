{{/* vim: set filetype=mustache: */}}
{{/*
Generate secret name.

Usage:
{{ include "common.secrets.name" (dict "existingSecret" .Values.path.to.the.existingSecret "defaultNameSuffix" "mySuffix" "context" $) }}

Params:
  - existingSecret - ExistingSecret - Optional. The path to the existing secrets in the values.yaml given by the user
    to be used istead of the default one. +info: https://github.com/bitnami/charts/tree/master/bitnami/common#existingsecret
  - defaultNameSuffix - String - Optional. It is used only if we have several secrets in the same deployment.
  - context - Dict - Required. The context for the template evaluation.
*/}}
{{- define "common.secrets.name" -}}
{{- $name := (include "common.names.fullname" .context) -}}

{{- if .defaultNameSuffix -}}
{{- $name = printf "%s-%s" $name .defaultNameSuffix | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- with .existingSecret -}}
{{- $name = .name -}}
{{- end -}}

{{- printf "%s" $name -}}
{{- end -}}

{{/*
Generate secret key.

Usage:
{{ include "common.secrets.key" (dict "existingSecret" .Values.path.to.the.existingSecret "key" "keyName") }}

Params:
  - existingSecret - ExistingSecret - Optional. The path to the existing secrets in the values.yaml given by the user
    to be used istead of the default one. +info: https://github.com/bitnami/charts/tree/master/bitnami/common#existingsecret
  - key - String - Required. Name of the key in the secret.
*/}}
{{- define "common.secrets.key" -}}
{{- $key := .key -}}

{{- if .existingSecret -}}
  {{- if .existingSecret.keyMapping -}}
    {{- $key = index .existingSecret.keyMapping $.key -}}
  {{- end -}}
{{- end -}}

{{- printf "%s" $key -}}
{{- end -}}
