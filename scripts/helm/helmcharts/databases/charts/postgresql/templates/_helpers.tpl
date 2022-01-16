{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "postgresql.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "postgresql.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}
{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "postgresql.master.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- $fullname := default (printf "%s-%s" .Release.Name $name) .Values.fullnameOverride -}}
{{- if .Values.replication.enabled -}}
{{- printf "%s-%s" $fullname "master" | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s" $fullname | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Return the appropriate apiVersion for networkpolicy.
*/}}
{{- define "postgresql.networkPolicy.apiVersion" -}}
{{- if semverCompare ">=1.4-0, <1.7-0" .Capabilities.KubeVersion.GitVersion -}}
"extensions/v1beta1"
{{- else if semverCompare "^1.7-0" .Capabilities.KubeVersion.GitVersion -}}
"networking.k8s.io/v1"
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "postgresql.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Return the proper PostgreSQL image name
*/}}
{{- define "postgresql.image" -}}
{{- $registryName := .Values.image.registry -}}
{{- $repositoryName := .Values.image.repository -}}
{{- $tag := .Values.image.tag | toString -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 doesn't support it, so we need to implement this if-else logic.
Also, we can't use a single if because lazy evaluation is not an option
*/}}
{{- if .Values.global }}
    {{- if .Values.global.imageRegistry }}
        {{- printf "%s/%s:%s" .Values.global.imageRegistry $repositoryName $tag -}}
    {{- else -}}
        {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
    {{- end -}}
{{- else -}}
    {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- end -}}
{{- end -}}

{{/*
Return PostgreSQL postgres user password
*/}}
{{- define "postgresql.postgres.password" -}}
{{- if .Values.global.postgresql.postgresqlPostgresPassword }}
    {{- .Values.global.postgresql.postgresqlPostgresPassword -}}
{{- else if .Values.postgresqlPostgresPassword -}}
    {{- .Values.postgresqlPostgresPassword -}}
{{- else -}}
    {{- randAlphaNum 10 -}}
{{- end -}}
{{- end -}}

{{/*
Return PostgreSQL password
*/}}
{{- define "postgresql.password" -}}
{{- if .Values.global.postgresql.postgresqlPassword }}
    {{- .Values.global.postgresql.postgresqlPassword -}}
{{- else if .Values.postgresqlPassword -}}
    {{- .Values.postgresqlPassword -}}
{{- else -}}
    {{- randAlphaNum 10 -}}
{{- end -}}
{{- end -}}

{{/*
Return PostgreSQL replication password
*/}}
{{- define "postgresql.replication.password" -}}
{{- if .Values.global.postgresql.replicationPassword }}
    {{- .Values.global.postgresql.replicationPassword -}}
{{- else if .Values.replication.password -}}
    {{- .Values.replication.password -}}
{{- else -}}
    {{- randAlphaNum 10 -}}
{{- end -}}
{{- end -}}

{{/*
Return PostgreSQL username
*/}}
{{- define "postgresql.username" -}}
{{- if .Values.global.postgresql.postgresqlUsername }}
    {{- .Values.global.postgresql.postgresqlUsername -}}
{{- else -}}
    {{- .Values.postgresqlUsername -}}
{{- end -}}
{{- end -}}


{{/*
Return PostgreSQL replication username
*/}}
{{- define "postgresql.replication.username" -}}
{{- if .Values.global.postgresql.replicationUser }}
    {{- .Values.global.postgresql.replicationUser -}}
{{- else -}}
    {{- .Values.replication.user -}}
{{- end -}}
{{- end -}}

{{/*
Return PostgreSQL port
*/}}
{{- define "postgresql.port" -}}
{{- if .Values.global.postgresql.servicePort }}
    {{- .Values.global.postgresql.servicePort -}}
{{- else -}}
    {{- .Values.service.port -}}
{{- end -}}
{{- end -}}

{{/*
Return PostgreSQL created database
*/}}
{{- define "postgresql.database" -}}
{{- if .Values.global.postgresql.postgresqlDatabase }}
    {{- .Values.global.postgresql.postgresqlDatabase -}}
{{- else if .Values.postgresqlDatabase -}}
    {{- .Values.postgresqlDatabase -}}
{{- end -}}
{{- end -}}

{{/*
Return the proper image name to change the volume permissions
*/}}
{{- define "postgresql.volumePermissions.image" -}}
{{- $registryName := .Values.volumePermissions.image.registry -}}
{{- $repositoryName := .Values.volumePermissions.image.repository -}}
{{- $tag := .Values.volumePermissions.image.tag | toString -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 doesn't support it, so we need to implement this if-else logic.
Also, we can't use a single if because lazy evaluation is not an option
*/}}
{{- if .Values.global }}
    {{- if .Values.global.imageRegistry }}
        {{- printf "%s/%s:%s" .Values.global.imageRegistry $repositoryName $tag -}}
    {{- else -}}
        {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
    {{- end -}}
{{- else -}}
    {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- end -}}
{{- end -}}

{{/*
Return the proper PostgreSQL metrics image name
*/}}
{{- define "postgresql.metrics.image" -}}
{{- $registryName :=  default "docker.io" .Values.metrics.image.registry -}}
{{- $repositoryName := .Values.metrics.image.repository -}}
{{- $tag := default "latest" .Values.metrics.image.tag | toString -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 doesn't support it, so we need to implement this if-else logic.
Also, we can't use a single if because lazy evaluation is not an option
*/}}
{{- if .Values.global }}
    {{- if .Values.global.imageRegistry }}
        {{- printf "%s/%s:%s" .Values.global.imageRegistry $repositoryName $tag -}}
    {{- else -}}
        {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
    {{- end -}}
{{- else -}}
    {{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- end -}}
{{- end -}}

{{/*
Get the password secret.
*/}}
{{- define "postgresql.secretName" -}}
{{- if .Values.global.postgresql.existingSecret }}
    {{- printf "%s" (tpl .Values.global.postgresql.existingSecret $) -}}
{{- else if .Values.existingSecret -}}
    {{- printf "%s" (tpl .Values.existingSecret $) -}}
{{- else -}}
    {{- printf "%s" (include "postgresql.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Return true if we should use an existingSecret.
*/}}
{{- define "postgresql.useExistingSecret" -}}
{{- if or .Values.global.postgresql.existingSecret .Values.existingSecret -}}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Return true if a secret object should be created
*/}}
{{- define "postgresql.createSecret" -}}
{{- if not (include "postgresql.useExistingSecret" .) -}}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Get the configuration ConfigMap name.
*/}}
{{- define "postgresql.configurationCM" -}}
{{- if .Values.configurationConfigMap -}}
{{- printf "%s" (tpl .Values.configurationConfigMap $) -}}
{{- else -}}
{{- printf "%s-configuration" (include "postgresql.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Get the extended configuration ConfigMap name.
*/}}
{{- define "postgresql.extendedConfigurationCM" -}}
{{- if .Values.extendedConfConfigMap -}}
{{- printf "%s" (tpl .Values.extendedConfConfigMap $) -}}
{{- else -}}
{{- printf "%s-extended-configuration" (include "postgresql.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Return true if a configmap should be mounted with PostgreSQL configuration
*/}}
{{- define "postgresql.mountConfigurationCM" -}}
{{- if or (.Files.Glob "files/postgresql.conf") (.Files.Glob "files/pg_hba.conf") .Values.postgresqlConfiguration .Values.pgHbaConfiguration .Values.configurationConfigMap }}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Get the initialization scripts ConfigMap name.
*/}}
{{- define "postgresql.initdbScriptsCM" -}}
{{- if .Values.initdbScriptsConfigMap -}}
{{- printf "%s" (tpl .Values.initdbScriptsConfigMap $) -}}
{{- else -}}
{{- printf "%s-init-scripts" (include "postgresql.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Get the initialization scripts Secret name.
*/}}
{{- define "postgresql.initdbScriptsSecret" -}}
{{- printf "%s" (tpl .Values.initdbScriptsSecret $) -}}
{{- end -}}

{{/*
Get the metrics ConfigMap name.
*/}}
{{- define "postgresql.metricsCM" -}}
{{- printf "%s-metrics" (include "postgresql.fullname" .) -}}
{{- end -}}

{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "postgresql.imagePullSecrets" -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 does not support it, so we need to implement this if-else logic.
Also, we can not use a single if because lazy evaluation is not an option
*/}}
{{- if .Values.global }}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- else if or .Values.image.pullSecrets .Values.metrics.image.pullSecrets .Values.volumePermissions.image.pullSecrets }}
imagePullSecrets:
{{- range .Values.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.metrics.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.volumePermissions.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end -}}
{{- else if or .Values.image.pullSecrets .Values.metrics.image.pullSecrets .Values.volumePermissions.image.pullSecrets }}
imagePullSecrets:
{{- range .Values.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.metrics.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.volumePermissions.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end -}}
{{- end -}}

{{/*
Get the readiness probe command
*/}}
{{- define "postgresql.readinessProbeCommand" -}}
- |
{{- if (include "postgresql.database" .) }}
  exec pg_isready -U {{ include "postgresql.username" . | quote }} -d "dbname={{ include "postgresql.database" . }} {{- if and .Values.tls.enabled .Values.tls.certCAFilename }} sslcert={{ include "postgresql.tlsCert" . }} sslkey={{ include "postgresql.tlsCertKey" . }}{{- end }}" -h 127.0.0.1 -p {{ template "postgresql.port" . }}
{{- else }}
  exec pg_isready -U {{ include "postgresql.username" . | quote }} {{- if and .Values.tls.enabled .Values.tls.certCAFilename }} -d "sslcert={{ include "postgresql.tlsCert" . }} sslkey={{ include "postgresql.tlsCertKey" . }}"{{- end }} -h 127.0.0.1 -p {{ template "postgresql.port" . }}
{{- end }}
{{- if contains "bitnami/" .Values.image.repository }}
  [ -f /opt/bitnami/postgresql/tmp/.initialized ] || [ -f /bitnami/postgresql/.initialized ]
{{- end -}}
{{- end -}}

{{/*
Return  the proper Storage Class
*/}}
{{- define "postgresql.storageClass" -}}
{{/*
Helm 2.11 supports the assignment of a value to a variable defined in a different scope,
but Helm 2.9 and 2.10 does not support it, so we need to implement this if-else logic.
*/}}
{{- if .Values.global -}}
    {{- if .Values.global.storageClass -}}
        {{- if (eq "-" .Values.global.storageClass) -}}
            {{- printf "storageClassName: \"\"" -}}
        {{- else }}
            {{- printf "storageClassName: %s" .Values.global.storageClass -}}
        {{- end -}}
    {{- else -}}
        {{- if .Values.persistence.storageClass -}}
              {{- if (eq "-" .Values.persistence.storageClass) -}}
                  {{- printf "storageClassName: \"\"" -}}
              {{- else }}
                  {{- printf "storageClassName: %s" .Values.persistence.storageClass -}}
              {{- end -}}
        {{- end -}}
    {{- end -}}
{{- else -}}
    {{- if .Values.persistence.storageClass -}}
        {{- if (eq "-" .Values.persistence.storageClass) -}}
            {{- printf "storageClassName: \"\"" -}}
        {{- else }}
            {{- printf "storageClassName: %s" .Values.persistence.storageClass -}}
        {{- end -}}
    {{- end -}}
{{- end -}}
{{- end -}}

{{/*
Return the appropriate apiVersion for statefulset.
*/}}
{{- define "postgresql.statefulset.apiVersion" -}}
{{- if semverCompare "<1.14-0" .Capabilities.KubeVersion.GitVersion -}}
{{- print "apps/v1beta2" -}}
{{- else -}}
{{- print "apps/v1" -}}
{{- end -}}
{{- end -}}

{{/*
Compile all warnings into a single message, and call fail.
*/}}
{{- define "postgresql.validateValues" -}}
{{- $messages := list -}}
{{- $messages := append $messages (include "postgresql.validateValues.ldapConfigurationMethod" .) -}}
{{- $messages := append $messages (include "postgresql.validateValues.psp" .) -}}
{{- $messages := append $messages (include "postgresql.validateValues.tls" .) -}}
{{- $messages := without $messages "" -}}
{{- $message := join "\n" $messages -}}

{{- if $message -}}
{{- printf "\nVALUES VALIDATION:\n%s" $message | fail -}}
{{- end -}}
{{- end -}}

{{/*
Validate values of Postgresql - If ldap.url is used then you don't need the other settings for ldap
*/}}
{{- define "postgresql.validateValues.ldapConfigurationMethod" -}}
{{- if and .Values.ldap.enabled (and (not (empty .Values.ldap.url)) (not (empty .Values.ldap.server))) }}
postgresql: ldap.url, ldap.server
    You cannot set both `ldap.url` and `ldap.server` at the same time.
    Please provide a unique way to configure LDAP.
    More info at https://www.postgresql.org/docs/current/auth-ldap.html
{{- end -}}
{{- end -}}

{{/*
Validate values of Postgresql - If PSP is enabled RBAC should be enabled too
*/}}
{{- define "postgresql.validateValues.psp" -}}
{{- if and .Values.psp.create (not .Values.rbac.create) }}
postgresql: psp.create, rbac.create
    RBAC should be enabled if PSP is enabled in order for PSP to work.
    More info at https://kubernetes.io/docs/concepts/policy/pod-security-policy/#authorizing-policies
{{- end -}}
{{- end -}}

{{/*
Return the appropriate apiVersion for podsecuritypolicy.
*/}}
{{- define "podsecuritypolicy.apiVersion" -}}
{{- if semverCompare "<1.10-0" .Capabilities.KubeVersion.GitVersion -}}
{{- print "extensions/v1beta1" -}}
{{- else -}}
{{- print "policy/v1beta1" -}}
{{- end -}}
{{- end -}}

{{/*
Validate values of Postgresql TLS - When TLS is enabled, so must be VolumePermissions
*/}}
{{- define "postgresql.validateValues.tls" -}}
{{- if and .Values.tls.enabled (not .Values.volumePermissions.enabled) }}
postgresql: tls.enabled, volumePermissions.enabled
    When TLS is enabled you must enable volumePermissions as well to ensure certificates files have
    the right permissions.
{{- end -}}
{{- end -}}

{{/*
Return the path to the cert file.
*/}}
{{- define "postgresql.tlsCert" -}}
{{- required "Certificate filename is required when TLS in enabled" .Values.tls.certFilename | printf "/opt/bitnami/postgresql/certs/%s" -}}
{{- end -}}

{{/*
Return the path to the cert key file.
*/}}
{{- define "postgresql.tlsCertKey" -}}
{{- required "Certificate Key filename is required when TLS in enabled" .Values.tls.certKeyFilename | printf "/opt/bitnami/postgresql/certs/%s" -}}
{{- end -}}

{{/*
Return the path to the CA cert file.
*/}}
{{- define "postgresql.tlsCACert" -}}
{{- printf "/opt/bitnami/postgresql/certs/%s" .Values.tls.certCAFilename -}}
{{- end -}}

{{/*
Return the path to the CRL file.
*/}}
{{- define "postgresql.tlsCRL" -}}
{{- if .Values.tls.crlFilename -}}
{{- printf "/opt/bitnami/postgresql/certs/%s" .Values.tls.crlFilename -}}
{{- end -}}
{{- end -}}
