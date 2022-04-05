{{- define "defaults.ingress-host" -}}
{{- if eq (or .Values.component .Chart.Name) "app" -}}
{{- tpl (or .Values.host .Values.global.host) . -}}
{{- else -}}
{{- tpl (or .Values.host (print (or .Values.component .Chart.Name) "-" .Values.global.host)) . -}}
{{- end -}}
{{- end -}}