
{{/* vim: set filetype=mustache: */}}
{{/*
Validate Redis(TM) required passwords are not empty.

Usage:
{{ include "common.validations.values.redis.passwords" (dict "secret" "secretName" "subchart" false "context" $) }}
Params:
  - secret - String - Required. Name of the secret where redis values are stored, e.g: "redis-passwords-secret"
  - subchart - Boolean - Optional. Whether redis is used as subchart or not. Default: false
*/}}
{{- define "common.validations.values.redis.passwords" -}}
  {{- $existingSecret := include "common.redis.values.existingSecret" . -}}
  {{- $enabled := include "common.redis.values.enabled" . -}}
  {{- $valueKeyPrefix := include "common.redis.values.keys.prefix" . -}}
  {{- $valueKeyRedisPassword := printf "%s%s" $valueKeyPrefix "password" -}}
  {{- $valueKeyRedisUsePassword := printf "%s%s" $valueKeyPrefix "usePassword" -}}

  {{- if and (not $existingSecret) (eq $enabled "true") -}}
    {{- $requiredPasswords := list -}}

    {{- $usePassword := include "common.utils.getValueFromKey" (dict "key" $valueKeyRedisUsePassword "context" .context) -}}
    {{- if eq $usePassword "true" -}}
      {{- $requiredRedisPassword := dict "valueKey" $valueKeyRedisPassword "secret" .secret "field" "redis-password" -}}
      {{- $requiredPasswords = append $requiredPasswords $requiredRedisPassword -}}
    {{- end -}}

    {{- include "common.validations.values.multiple.empty" (dict "required" $requiredPasswords "context" .context) -}}
  {{- end -}}
{{- end -}}

{{/*
Redis Auxiliary function to get the right value for existingSecret.

Usage:
{{ include "common.redis.values.existingSecret" (dict "context" $) }}
Params:
  - subchart - Boolean - Optional. Whether Redis(TM) is used as subchart or not. Default: false
*/}}
{{- define "common.redis.values.existingSecret" -}}
  {{- if .subchart -}}
    {{- .context.Values.redis.existingSecret | quote -}}
  {{- else -}}
    {{- .context.Values.existingSecret | quote -}}
  {{- end -}}
{{- end -}}

{{/*
Auxiliary function to get the right value for enabled redis.

Usage:
{{ include "common.redis.values.enabled" (dict "context" $) }}
*/}}
{{- define "common.redis.values.enabled" -}}
  {{- if .subchart -}}
    {{- printf "%v" .context.Values.redis.enabled -}}
  {{- else -}}
    {{- printf "%v" (not .context.Values.enabled) -}}
  {{- end -}}
{{- end -}}

{{/*
Auxiliary function to get the right prefix path for the values

Usage:
{{ include "common.redis.values.key.prefix" (dict "subchart" "true" "context" $) }}
Params:
  - subchart - Boolean - Optional. Whether redis is used as subchart or not. Default: false
*/}}
{{- define "common.redis.values.keys.prefix" -}}
  {{- if .subchart -}}redis.{{- else -}}{{- end -}}
{{- end -}}
