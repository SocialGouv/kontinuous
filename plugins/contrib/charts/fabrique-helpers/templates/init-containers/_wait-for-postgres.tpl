{{- define "fabrique-helpers.init-containers.wait-for-postgres" -}}
- name: wait-for-postgres
  image: ghcr.io/socialgouv/docker/wait-for-postgres:6.56.1
  imagePullPolicy: Always
  env:
    - name: WAIT_FOR_RETRIES
      value: '24'
  envFrom:
    - secretRef:
        name: {{ or .Values.pgSecretName .Values.global.pgSecretName }}
  resources:
    limits:
      cpu: 20m
      memory: 32Mi
    requests:
      cpu: 5m
      memory: 16Mi
{{- end -}}
