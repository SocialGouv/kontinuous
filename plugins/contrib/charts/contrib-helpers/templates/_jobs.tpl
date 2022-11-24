{{- define "contrib-helpers.jobs" -}}
{{- range $name, $run := $.Values.runs }}
  {{- if or (kindIs "invalid" $run.enabled) $run.enabled }}
---
    {{- $context := (merge (dict "run" $run "with" $run.with "parentWith" $run.parentWith) $) -}}
    {{- if not $run.if }}
      {{- include "contrib-helpers.job" $context }}
    {{- else if (tpl $run.if $context) }}
      {{- include "contrib-helpers.job" $context }}
    {{- end }}
  {{- end }}
{{- end }}
{{ end }}