{{- define "annotations.kapp-deployment" -}}
kapp.k14s.io/disable-default-ownership-label-rules: ""
kapp.k14s.io/disable-default-label-scoping-rules: ""
kapp.k14s.io/nonce: ""
kapp.k14s.io/create-strategy: fallback-on-update
kapp.k14s.io/update-strategy: fallback-on-replace
kapp.k14s.io/change-group: "kube-workflow/{{ $.Values.global.namespace }}"
kapp.k14s.io/change-group.{{ or .Values.component .Chart.Name }}: "kube-workflow/{{ or $.Values.component .Chart.Name }}.{{ $.Values.global.namespace }}"
{{- range $need := $.Values.needs }}
kapp.k14s.io/change-rule.{{ $need }}: "upsert after upserting kube-workflow/{{ $need }}.{{ $.Values.global.namespace }}"
{{- end }}
{{- end -}}