{{/* vim: set filetype=mustache: */}}
{{/*
Through error when upgrading using empty passwords values that must not be empty.

Usage:
{{- $validationError00 := include "common.validations.values.single.empty" (dict "valueKey" "path.to.password00" "secret" "secretName" "field" "password-00") -}}
{{- $validationError01 := include "common.validations.values.single.empty" (dict "valueKey" "path.to.password01" "secret" "secretName" "field" "password-01") -}}
{{ include "common.errors.upgrade.passwords.empty" (dict "validationErrors" (list $validationError00 $validationError01) "context" $) }}

Required password params:
  - validationErrors - String - Required. List of validation strings to be return, if it is empty it won't throw error.
  - context - Context - Required. Parent context.
*/}}
{{- define "common.errors.upgrade.passwords.empty" -}}
  {{- $validationErrors := join "" .validationErrors -}}
  {{- if and $validationErrors .context.Release.IsUpgrade -}}
    {{- $errorString := "\nPASSWORDS ERROR: you must provide your current passwords when upgrade the release%s" -}}
    {{- printf $errorString $validationErrors | fail -}}
  {{- end -}}
{{- end -}}
