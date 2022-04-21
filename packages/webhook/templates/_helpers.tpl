{{ define "metadata.namespace" }}
{{- if .Values.namespace }}
namespace: "{{ .Values.namespace }}"
{{- else }}
namespace: "webhook-{{ .Values.rancherProjectName }}"
{{- end }}
{{ end }}