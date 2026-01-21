{{/* vim: set filetype=mustache: */}}

{{/*
Expand the name of the chart.
*/}}
{{- define "nginx-ingress.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "nginx-ingress.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create a default fully qualified controller name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "nginx-ingress.controller.fullname" -}}
{{- printf "%s-%s" (include "nginx-ingress.fullname" .) .Values.controller.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified controller service name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "nginx-ingress.controller.service.name" -}}
{{- default (include "nginx-ingress.controller.fullname" .) .Values.serviceNameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "nginx-ingress.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "nginx-ingress.labels" -}}
helm.sh/chart: {{ include "nginx-ingress.chart" . }}
{{ include "nginx-ingress.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Pod labels
*/}}
{{- define "nginx-ingress.podLabels" -}}
{{- include "nginx-ingress.selectorLabels" . }}
{{- if .Values.nginxServiceMesh.enable }}
nsm.nginx.com/enable-ingress: "true"
nsm.nginx.com/enable-egress: "{{ .Values.nginxServiceMesh.enableEgress }}"
nsm.nginx.com/{{ .Values.controller.kind }}: {{ include "nginx-ingress.controller.fullname" . }}
{{- end }}
{{- if and .Values.nginxAgent.enable (eq (.Values.nginxAgent.customConfigMap | default "") "") }}
agent-configuration-revision-hash: {{ include "nginx-ingress.agentConfiguration" . | sha1sum | trunc 8 | quote }}
{{- end }}
{{- if .Values.controller.pod.extraLabels }}
{{ toYaml .Values.controller.pod.extraLabels }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "nginx-ingress.selectorLabels" -}}
{{- if .Values.controller.selectorLabels -}}
{{ toYaml .Values.controller.selectorLabels }}
{{- else -}}
app.kubernetes.io/name: {{ include "nginx-ingress.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
{{- end -}}

{{/*
Expand the name of the configmap.
*/}}
{{- define "nginx-ingress.configName" -}}
{{- if .Values.controller.customConfigMap -}}
{{ .Values.controller.customConfigMap }}
{{- else -}}
{{- default (include "nginx-ingress.fullname" .) .Values.controller.config.name -}}
{{- end -}}
{{- end -}}

{{/*
Expand the name of the configmap used for NGINX Agent.
*/}}
{{- define "nginx-ingress.agentConfigName" -}}
{{- if ne (.Values.nginxAgent.customConfigMap | default "") "" -}}
{{ .Values.nginxAgent.customConfigMap }}
{{- else -}}
{{- printf "%s-agent-config"  (include "nginx-ingress.fullname" . | trunc 49 | trimSuffix "-") -}}
{{- end -}}
{{- end -}}

{{/*
Expand the name of the mgmt configmap.
*/}}
{{- define "nginx-ingress.mgmtConfigName" -}}
{{- if .Values.controller.mgmt.configMapName -}}
{{ .Values.controller.mgmt.configMapName }}
{{- else -}}
{{- default (printf "%s-mgmt" (include "nginx-ingress.fullname" .)) -}}
{{- end -}}
{{- end -}}

{{/*
Expand license token secret name.
*/}}
{{- define "nginx-ingress.licenseTokenSecretName" -}}
{{- if hasKey .Values.controller.mgmt "licenseTokenSecretName" -}}
{{- .Values.controller.mgmt.licenseTokenSecretName -}}
{{- else }}
{{- fail "Error: When using Nginx Plus, 'controller.mgmt.licenseTokenSecretName' must be set." }}
{{- end -}}
{{- end -}}

{{/*
Expand leader election lock name.
*/}}
{{- define "nginx-ingress.leaderElectionName" -}}
{{- if .Values.controller.reportIngressStatus.leaderElectionLockName -}}
{{ .Values.controller.reportIngressStatus.leaderElectionLockName }}
{{- else -}}
{{- printf "%s-%s" (include "nginx-ingress.fullname" .) "leader-election" -}}
{{- end -}}
{{- end -}}

{{/*
Expand service account name.
*/}}
{{- define "nginx-ingress.serviceAccountName" -}}
{{- default (include "nginx-ingress.fullname" .) .Values.controller.serviceAccount.name -}}
{{- end -}}

{{/*
Expand default TLS name.
*/}}
{{- define "nginx-ingress.defaultTLSName" -}}
{{- printf "%s-%s" (include "nginx-ingress.fullname" .) "default-server-tls" -}}
{{- end -}}

{{/*
Expand wildcard TLS name.
*/}}
{{- define "nginx-ingress.wildcardTLSName" -}}
{{- printf "%s-%s" (include "nginx-ingress.fullname" .) "wildcard-tls" -}}
{{- end -}}

{{- define "nginx-ingress.tag" -}}
{{- default .Chart.AppVersion .Values.controller.image.tag -}}
{{- end -}}

{{/*
Expand image name.
*/}}
{{- define "nginx-ingress.image" -}}
{{ include "nginx-ingress.image-digest-or-tag" (dict "image" .Values.controller.image "default" .Chart.AppVersion ) }}
{{- end -}}

{{- define "nap-enforcer.image" -}}
{{ include "nginx-ingress.image-digest-or-tag" (dict "image" .Values.controller.appprotect.enforcer.image "default" .Chart.AppVersion ) }}
{{- end -}}

{{- define "nap-config-manager.image" -}}
{{ include "nginx-ingress.image-digest-or-tag" (dict "image" .Values.controller.appprotect.configManager.image "default" .Chart.AppVersion ) }}
{{- end -}}

{{/*
Accepts an image struct like .Values.controller.image along with a default value to use
if the digest or tag is not set. Can be called like:
include "nginx-ingress.image-digest-or-tag" (dict "image" .Values.controller.image "default" .Chart.AppVersion
*/}}
{{- define "nginx-ingress.image-digest-or-tag" -}}
{{- if .image.digest -}}
{{- printf "%s@%s" .image.repository .image.digest -}}
{{- else -}}
{{- printf "%s:%s" .image.repository (default .default .image.tag) -}}
{{- end -}}
{{- end -}}

{{- define "nginx-ingress.prometheus.serviceName" -}}
{{- printf "%s-%s" (include "nginx-ingress.fullname" .) "prometheus-service"  -}}
{{- end -}}

{{/*
return if readOnlyRootFilesystem is enabled or not.
*/}}
{{- define "nginx-ingress.readOnlyRootFilesystem" -}}
{{- if or .Values.controller.readOnlyRootFilesystem (and .Values.controller.securityContext .Values.controller.securityContext.readOnlyRootFilesystem) -}}
true
{{- else -}}
false
{{- end -}}
{{- end -}}

{{/*
Validate the globalConfiguration.customName value format.
Ensures exactly one '/' separator for proper namespace/name parsing.
*/}}
{{- define "nginx-ingress.globalConfiguration.validateCustomName" -}}
{{- if .Values.controller.globalConfiguration.customName }}
{{- $parts := splitList "/" .Values.controller.globalConfiguration.customName }}
{{- if ne (len $parts) 2 }}
{{- fail "globalConfiguration.customName must contain exactly one '/' separator in namespace/name format (e.g., \"my-namespace/my-global-config\")" }}
{{- end }}
{{- if or (eq (index $parts 0) "") (eq (index $parts 1) "") }}
{{- fail "globalConfiguration.customName namespace and name parts cannot be empty (e.g., \"my-namespace/my-global-config\")" }}
{{- end }}
{{- end }}
{{- end -}}

{{/*
Create the global configuration custom name from the globalConfiguration.customName value.
*/}}
{{- define "nginx-ingress.globalConfiguration.customName" -}}
{{- include "nginx-ingress.globalConfiguration.validateCustomName" . -}}
{{- $parts := splitList "/" .Values.controller.globalConfiguration.customName -}}
{{- index $parts 1 -}}
{{- end -}}

{{/*
Create the global configuration custom namespace from the globalConfiguration.customName value.
*/}}
{{- define "nginx-ingress.globalConfiguration.customNamespace" -}}
{{- include "nginx-ingress.globalConfiguration.validateCustomName" . -}}
{{- $parts := splitList "/" .Values.controller.globalConfiguration.customName -}}
{{- index $parts 0 -}}
{{- end -}}

{{/*
Build the args for the service binary.
*/}}
{{- define "nginx-ingress.args" -}}
{{- if and .Values.controller.debug .Values.controller.debug.enable }}
- --listen=:2345
- --headless=true
- --log=true
- --log-output=debugger,debuglineerr,gdbwire,lldbout,rpc,dap,fncall,minidump,stack
- --accept-multiclient
- --api-version=2
- exec
- ./nginx-ingress
{{- if .Values.controller.debug.continue }}
- --continue
{{- end }}
- --
{{- end }}
- -nginx-plus={{ .Values.controller.nginxplus }}
- -nginx-reload-timeout={{ .Values.controller.nginxReloadTimeout }}
- -enable-app-protect={{ .Values.controller.appprotect.enable }}
{{- if and .Values.controller.appprotect.enable .Values.controller.appprotect.logLevel }}
- -app-protect-log-level={{ .Values.controller.appprotect.logLevel }}
{{ end }}
{{- if and .Values.controller.appprotect.enable .Values.controller.appprotect.v5 }}
- -app-protect-enforcer-address="{{ .Values.controller.appprotect.enforcer.host | default "127.0.0.1" }}:{{ .Values.controller.appprotect.enforcer.port | default 50000 }}"
{{- end }}
- -enable-app-protect-dos={{ .Values.controller.appprotectdos.enable }}
{{- if .Values.controller.appprotectdos.enable }}
- -app-protect-dos-debug={{ .Values.controller.appprotectdos.debug }}
- -app-protect-dos-max-daemons={{ .Values.controller.appprotectdos.maxDaemons }}
- -app-protect-dos-max-workers={{ .Values.controller.appprotectdos.maxWorkers }}
- -app-protect-dos-memory={{ .Values.controller.appprotectdos.memory }}
{{ end }}
- -nginx-configmaps=$(POD_NAMESPACE)/{{ include "nginx-ingress.configName" . }}
{{- if .Values.controller.nginxplus }}
- -mgmt-configmap=$(POD_NAMESPACE)/{{ include "nginx-ingress.mgmtConfigName" . }}
{{- end }}
{{- if .Values.controller.defaultTLS.secret }}
- -default-server-tls-secret={{ .Values.controller.defaultTLS.secret }}
{{ else if and (.Values.controller.defaultTLS.cert) (.Values.controller.defaultTLS.key) }}
- -default-server-tls-secret=$(POD_NAMESPACE)/{{ include "nginx-ingress.defaultTLSName" . }}
{{- end }}
- -ingress-class={{ .Values.controller.ingressClass.name }}
{{- if .Values.controller.watchNamespace }}
- -watch-namespace={{ .Values.controller.watchNamespace }}
{{- end }}
{{- if .Values.controller.watchNamespaceLabel }}
- -watch-namespace-label={{ .Values.controller.watchNamespaceLabel }}
{{- end }}
{{- if .Values.controller.watchSecretNamespace }}
- -watch-secret-namespace={{ .Values.controller.watchSecretNamespace }}
{{- end }}
- -health-status={{ .Values.controller.healthStatus }}
- -health-status-uri={{ .Values.controller.healthStatusURI }}
- -nginx-debug={{ .Values.controller.nginxDebug }}
- -log-level={{ .Values.controller.logLevel }}
- -log-format={{ .Values.controller.logFormat }}
- -nginx-status={{ .Values.controller.nginxStatus.enable }}
{{- if .Values.controller.nginxStatus.enable }}
- -nginx-status-port={{ .Values.controller.nginxStatus.port }}
- -nginx-status-allow-cidrs={{ .Values.controller.nginxStatus.allowCidrs }}
{{- end }}
{{- if .Values.controller.reportIngressStatus.enable }}
- -report-ingress-status
{{- if .Values.controller.reportIngressStatus.ingressLink }}
- -ingresslink={{ .Values.controller.reportIngressStatus.ingressLink }}
{{- else if .Values.controller.reportIngressStatus.externalService }}
- -external-service={{ .Values.controller.reportIngressStatus.externalService }}
{{- else if and (.Values.controller.service.create) (eq .Values.controller.service.type "LoadBalancer") }}
- -external-service={{ include "nginx-ingress.controller.service.name" . }}
{{- end }}
{{- end }}
- -enable-leader-election={{ .Values.controller.reportIngressStatus.enableLeaderElection }}
{{- if .Values.controller.reportIngressStatus.enableLeaderElection }}
- -leader-election-lock-name={{ include "nginx-ingress.leaderElectionName" . }}
{{- end }}
{{- if .Values.controller.wildcardTLS.secret }}
- -wildcard-tls-secret={{ .Values.controller.wildcardTLS.secret }}
{{- else if and .Values.controller.wildcardTLS.cert .Values.controller.wildcardTLS.key }}
- -wildcard-tls-secret=$(POD_NAMESPACE)/{{ include "nginx-ingress.wildcardTLSName" . }}
{{- end }}
- -enable-prometheus-metrics={{ .Values.prometheus.create }}
- -prometheus-metrics-listen-port={{ .Values.prometheus.port }}
- -prometheus-tls-secret={{ .Values.prometheus.secret }}
- -enable-service-insight={{ .Values.serviceInsight.create }}
- -service-insight-listen-port={{ .Values.serviceInsight.port }}
- -service-insight-tls-secret={{ .Values.serviceInsight.secret }}
- -enable-custom-resources={{ .Values.controller.enableCustomResources }}
- -enable-snippets={{ .Values.controller.enableSnippets }}
- -disable-ipv6={{ .Values.controller.disableIPV6 }}
{{- if .Values.controller.directiveAutoAdjust }}
- -enable-directive-autoadjust={{ .Values.controller.directiveAutoAdjust }}
{{- end }}
{{- if .Values.controller.enableCustomResources }}
- -enable-tls-passthrough={{ .Values.controller.enableTLSPassthrough }}
{{- if .Values.controller.enableTLSPassthrough }}
- -tls-passthrough-port={{ .Values.controller.tlsPassthroughPort }}
{{- end }}
- -enable-cert-manager={{ .Values.controller.enableCertManager }}
- -enable-oidc={{ .Values.controller.enableOIDC }}
- -enable-external-dns={{ .Values.controller.enableExternalDNS }}
- -default-http-listener-port={{ .Values.controller.defaultHTTPListenerPort}}
- -default-https-listener-port={{ .Values.controller.defaultHTTPSListenerPort}}
{{- if and .Values.controller.globalConfiguration.create (not .Values.controller.globalConfiguration.customName) }}
- -global-configuration=$(POD_NAMESPACE)/{{ include "nginx-ingress.controller.fullname" . }}
{{- else if .Values.controller.globalConfiguration.customName }}
- -global-configuration={{ .Values.controller.globalConfiguration.customName }}
{{- end }}
{{- end }}
- -ready-status={{ .Values.controller.readyStatus.enable }}
- -ready-status-port={{ .Values.controller.readyStatus.port }}
- -enable-latency-metrics={{ .Values.controller.enableLatencyMetrics }}
- -ssl-dynamic-reload={{ .Values.controller.enableSSLDynamicReload }}
- -enable-telemetry-reporting={{ .Values.controller.telemetryReporting.enable}}
- -weight-changes-dynamic-reload={{ .Values.controller.enableWeightChangesDynamicReload}}
{{- if .Values.nginxAgent.enable }}
- -agent=true
{{- if eq .Values.nginxAgent.dataplaneKeySecretName "" }}
- -agent-instance-group={{ default (include "nginx-ingress.controller.fullname" .) .Values.nginxAgent.instanceGroup }}
{{- end }}
{{- end }}
{{- end -}}

{{/*
Volumes for controller.
*/}}
{{- define "nginx-ingress.volumes" -}}
{{- $volumesSet := "false" }}
volumes:
{{- if eq (include "nginx-ingress.volumeEntries" .) "" -}}
{{ toYaml list | printf " %s" }}
{{- else }}
{{ include "nginx-ingress.volumeEntries" . }}
{{- end -}}
{{- end -}}

{{/*
List of volumes for controller.
*/}}
{{- define "nginx-ingress.volumeEntries" -}}
{{- if eq (include "nginx-ingress.readOnlyRootFilesystem" .) "true" }}
- name: nginx-etc
  emptyDir: {}
- name: nginx-lib
  emptyDir: {}
- name: nginx-state
  emptyDir: {}
- name: nginx-log
  emptyDir: {}
{{- /* For StatefulSet, nginx-cache volume is always provided via volumeClaimTemplates */ -}}
{{- if ne .Values.controller.kind "statefulset" }}
- name: nginx-cache
  emptyDir: {}
{{- end }}
{{- end }}
{{- if .Values.controller.appprotect.v5 }}
{{ toYaml .Values.controller.appprotect.volumes }}
{{- end }}
{{- if .Values.controller.volumes }}
{{ toYaml .Values.controller.volumes }}
{{- end }}
{{- if .Values.nginxAgent.enable }}
- name: agent-conf
  configMap:
    name: {{ include "nginx-ingress.agentConfigName" . }}
{{- if ne .Values.nginxAgent.dataplaneKeySecretName "" }}
- name: dataplane-key
  secret:
    secretName: {{ .Values.nginxAgent.dataplaneKeySecretName }}
{{- else }}
- name: agent-dynamic
  emptyDir: {}
{{- end }}
{{- if and .Values.nginxAgent.instanceManager.tls (or (ne (.Values.nginxAgent.instanceManager.tls.secret | default "") "") (ne (.Values.nginxAgent.instanceManager.tls.caSecret | default "") "")) }}
- name: nginx-agent-tls
  projected:
    sources:
{{- if ne .Values.nginxAgent.instanceManager.tls.secret "" }}
      - secret:
          name: {{ .Values.nginxAgent.instanceManager.tls.secret }}
{{- end }}
{{- if ne .Values.nginxAgent.instanceManager.tls.caSecret "" }}
      - secret:
          name: {{ .Values.nginxAgent.instanceManager.tls.caSecret }}
{{- end }}
{{- end }}
{{- end -}}
{{- end -}}

{{/*
Volume mounts for controller.
*/}}
{{- define "nginx-ingress.volumeMounts" -}}
{{- $volumesSet := "false" }}
volumeMounts:
{{- if eq (include "nginx-ingress.volumeMountEntries" .) "" -}}
{{ toYaml list | printf " %s" }}
{{- else }}
{{ include "nginx-ingress.volumeMountEntries" . }}
{{- end -}}
{{- end -}}
{{- define "nginx-ingress.volumeMountEntries" -}}
{{- if eq (include "nginx-ingress.readOnlyRootFilesystem" .) "true" }}
- mountPath: /etc/nginx
  name: nginx-etc
- mountPath: /var/cache/nginx
  name: nginx-cache
- mountPath: /var/lib/nginx
  name: nginx-lib
- mountPath: /var/lib/nginx/state
  name: nginx-state
- mountPath: /var/log/nginx
  name: nginx-log
{{- else if eq .Values.controller.kind "statefulset" }}
- mountPath: /var/cache/nginx
  name: nginx-cache
{{- end }}
{{- if .Values.controller.appprotect.v5 }}
- name: app-protect-bd-config
  mountPath: /opt/app_protect/bd_config
- name: app-protect-config
  mountPath: /opt/app_protect/config
  # app-protect-bundles is mounted so that Ingress Controller
  # can verify that referenced bundles are present
- name: app-protect-bundles
  mountPath: /etc/app_protect/bundles
{{- end }}
{{- if .Values.controller.volumeMounts }}
{{ toYaml .Values.controller.volumeMounts }}
{{- end }}
{{- if .Values.nginxAgent.enable }}
- name: agent-conf
  mountPath: /etc/nginx-agent/nginx-agent.conf
  subPath: nginx-agent.conf
{{- if ne .Values.nginxAgent.dataplaneKeySecretName "" }}
- name: dataplane-key
  mountPath: /etc/nginx-agent/secrets
{{- else }}
- name: agent-dynamic
  mountPath: /var/lib/nginx-agent
{{- end }}
{{- if and .Values.nginxAgent.instanceManager.tls (or (ne (.Values.nginxAgent.instanceManager.tls.secret | default "") "") (ne (.Values.nginxAgent.instanceManager.tls.caSecret | default "") "")) }}
- name: nginx-agent-tls
  mountPath: /etc/ssl/nms
  readOnly: true
{{- end }}
{{- end -}}
{{- end -}}

{{- define "nginx-ingress.appprotect.v5" -}}
{{- if .Values.controller.appprotect.v5}}
- name: waf-enforcer
  image: {{ include "nap-enforcer.image" . }}
  imagePullPolicy: "{{ .Values.controller.appprotect.enforcer.image.pullPolicy }}"
{{- if .Values.controller.appprotect.enforcer.securityContext }}
  securityContext:
{{ toYaml .Values.controller.appprotect.enforcer.securityContext | nindent 6 }}
{{- end }}
  env:
    - name: ENFORCER_PORT
      value: "{{ .Values.controller.appprotect.enforcer.port | default 50000 }}"
    - name: ENFORCER_CONFIG_TIMEOUT
      value: "0"
  volumeMounts:
    - name: app-protect-bd-config
      mountPath: /opt/app_protect/bd_config
- name: waf-config-mgr
  image: {{ include "nap-config-manager.image" . }}
  imagePullPolicy: "{{ .Values.controller.appprotect.configManager.image.pullPolicy }}"
{{- if .Values.controller.appprotect.configManager.securityContext }}
  securityContext:
{{ toYaml .Values.controller.appprotect.configManager.securityContext | nindent 6 }}
{{- end }}
  volumeMounts:
    - name: app-protect-bd-config
      mountPath: /opt/app_protect/bd_config
    - name: app-protect-config
      mountPath: /opt/app_protect/config
    - name: app-protect-bundles
      mountPath: /etc/app_protect/bundles
{{- end}}
{{- end -}}

{{- define "nginx-ingress.agentConfiguration" -}}
{{- if ne .Values.nginxAgent.dataplaneKeySecretName "" }}
log:
  # set log level (error, info, debug; default "info")
  level: {{ .Values.nginxAgent.logLevel }}
  # set log path. if empty, don't log to file.
  path: ""

allowed_directories:
  - /etc/nginx
  - /usr/lib/nginx/modules

features:
  - certificates
  - connection
  - metrics
  - file-watcher

## command server settings
command:
  server:
    host: {{ .Values.nginxAgent.endpointHost }}
    port: {{ .Values.nginxAgent.endpointPort }}
  auth:
    tokenpath: "/etc/nginx-agent/secrets/dataplane.key"
  tls:
    skip_verify: {{ .Values.nginxAgent.tlsSkipVerify | default false }}

{{- else }}
log:
  level: {{ .Values.nginxAgent.logLevel }}
  path: ""
server:
  host: {{ required ".Values.nginxAgent.instanceManager.host is required when setting .Values.nginxAgent.enable to true" .Values.nginxAgent.instanceManager.host }}
  grpcPort: {{ .Values.nginxAgent.instanceManager.grpcPort }}
{{- if ne (.Values.nginxAgent.instanceManager.sni | default "") ""  }}
  metrics: {{ .Values.nginxAgent.instanceManager.sni }}
  command: {{ .Values.nginxAgent.instanceManager.sni }}
{{- end }}
{{- if .Values.nginxAgent.instanceManager.tls  }}
tls:
  enable: {{ .Values.nginxAgent.instanceManager.tls.enable | default true }}
  skip_verify: {{ .Values.nginxAgent.instanceManager.tls.skipVerify | default false }}
  {{- if ne .Values.nginxAgent.instanceManager.tls.caSecret "" }}
  ca: "/etc/ssl/nms/ca.crt"
  {{- end }}
  {{- if ne .Values.nginxAgent.instanceManager.tls.secret "" }}
  cert: "/etc/ssl/nms/tls.crt"
  key: "/etc/ssl/nms/tls.key"
  {{- end }}
{{- end }}
features:
  - registration
  - nginx-counting
  - metrics
  - dataplane-status
extensions:
  - nginx-app-protect
  - nap-monitoring
nginx_app_protect:
  report_interval: 15s
  precompiled_publication: true
nap_monitoring:
  collector_buffer_size: {{ .Values.nginxAgent.napMonitoring.collectorBufferSize }}
  processor_buffer_size: {{ .Values.nginxAgent.napMonitoring.processorBufferSize }}
  syslog_ip: {{ .Values.nginxAgent.syslog.host }}
  syslog_port: {{ .Values.nginxAgent.syslog.port }}

{{- end }}
{{ end }}
