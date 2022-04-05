{{- define "annotations.letsencrypt-cert" -}}
cert-manager.io: cluster-issuer
kubernetes.io/tls-acme: 'true'
{{- end -}}