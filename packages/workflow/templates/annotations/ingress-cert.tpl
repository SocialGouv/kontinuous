{{- define "annotations.letsencrypt-cert" -}}
cert-manager.io: cluster-issuer
cert-manager.io/cluster-issuer: letsencrypt-prod
kubernetes.io/tls-acme: 'true'
{{- end -}}