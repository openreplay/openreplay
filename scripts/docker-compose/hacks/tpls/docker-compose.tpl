{{/*
# vim: ft=helm:
heuristics-openreplay:
 image: public.ecr.aws/p1t3u8a3/heuristics:${COMMON_VERSION}
 domainname: app.svc.cluster.local
 container_name: heuristics
 networks:
   openreplay-net:
     aliases:
       - heuristics-openreplay.app.svc.cluster.local
 env_file:
   - docker-envs/heuristics.env
 restart: unless-stopped
*/}}
{{- define "service" -}}
{{- $service_name := . }}
{{- $container_name := (splitList "-" $service_name) | first | printf "%s" }}
{{print $service_name}}:
 image: public.ecr.aws/p1t3u8a3/{{$container_name}}:${COMMON_VERSION}
 domainname: app.svc.cluster.local
 container_name: {{print $container_name}}
 networks:
   openreplay-net:
     aliases:
       - {{print $container_name}}-openreplay.app.svc.cluster.local
 env_file:
   - docker-envs/{{print $container_name}}.env
 restart: unless-stopped
{{ end -}}

{{- range $file := split "," (env "FILES")}}
{{- template "service" $file}}
{{- end}}
