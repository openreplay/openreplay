{{/*
Expand the name of the chart.
*/}}
{{- define "kafka.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "kafka.fullname" -}}
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
Create chart name and version as used by the chart label.
*/}}
{{- define "kafka.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "kafka.labels" -}}
helm.sh/chart: {{ include "kafka.chart" . }}
{{ include "kafka.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "kafka.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kafka.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "kafka.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "kafka.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Component labels
*/}}
{{- define "kafka.componentLabels" -}}
app.kubernetes.io/component: kafka
{{- end }}

{{/*
Generate controller quorum voters list
*/}}
{{- define "kafka.controllerQuorumVoters" -}}
{{- $fullname := include "kafka.fullname" . -}}
{{- $namespace := .Release.Namespace -}}
{{- $replicaCount := int .Values.replicaCount -}}
{{- $voters := list -}}
{{- range $i := until $replicaCount -}}
{{- $voters = append $voters (printf "%d@%s-%d.%s-headless.%s.svc.cluster.local:9093" (add1 $i) $fullname $i $fullname $namespace) -}}
{{- end -}}
{{- join "," $voters -}}
{{- end -}}

{{/*
Generate advertised listeners
*/}}
{{- define "kafka.advertisedListeners" -}}
{{- $fullname := include "kafka.fullname" . -}}
{{- $namespace := .Release.Namespace -}}
{{- $listeners := list -}}
{{- if .Values.listeners.client.enabled -}}
{{- $listeners = append $listeners (printf "CLIENT://${MY_POD_NAME}.%s-headless.%s.svc.cluster.local:9092" $fullname $namespace) -}}
{{- end -}}
{{- if .Values.listeners.ssl.enabled -}}
{{- $listeners = append $listeners (printf "SSL://${MY_POD_NAME}.%s-headless.%s.svc.cluster.local:9094" $fullname $namespace) -}}
{{- end -}}
{{- join "," $listeners -}}
{{- end -}}

{{/*
Generate listeners
*/}}
{{- define "kafka.listeners" -}}
{{- $listeners := list -}}
{{- if .Values.listeners.client.enabled -}}
{{- $listeners = append $listeners "CLIENT://:9092" -}}
{{- end -}}
{{- if .Values.listeners.internal.enabled -}}
{{- $listeners = append $listeners "INTERNAL://:9093" -}}
{{- end -}}
{{- if .Values.listeners.ssl.enabled -}}
{{- $listeners = append $listeners "SSL://:9094" -}}
{{- end -}}
{{- join "," $listeners -}}
{{- end -}}

{{/*
Generate listener security protocol map
*/}}
{{- define "kafka.listenerSecurityProtocolMap" -}}
{{- $protocols := list -}}
{{- if .Values.listeners.client.enabled -}}
{{- $protocols = append $protocols (printf "CLIENT:%s" .Values.listeners.client.protocol) -}}
{{- end -}}
{{- if .Values.listeners.internal.enabled -}}
{{- $protocols = append $protocols (printf "INTERNAL:%s" .Values.listeners.internal.protocol) -}}
{{- end -}}
{{- if .Values.listeners.ssl.enabled -}}
{{- $protocols = append $protocols (printf "SSL:%s" .Values.listeners.ssl.protocol) -}}
{{- end -}}
{{- join "," $protocols -}}
{{- end -}}
