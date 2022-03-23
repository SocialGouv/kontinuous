{{- define "job" -}}

{{ $run := $.run }}
{{ $with := $.with }}
{{ $parentWith := $.parentWith }}
{{ $val := $.Values }}

---
apiVersion: batch/v1
kind: Job
metadata:
  name: job-{{ $val.global.branchSlug }}-{{ join "--" $run.scope }}
  namespace: {{ or $val.namespace $val.global.jobNamespace }}
  annotations:
    kapp.k14s.io/nonce: ""
    kapp.k14s.io/update-strategy: fallback-on-replace
    kapp.k14s.io/change-group: "autodevops/{{ $val.global.namespace }}"
    {{- range $scope := $run.scopes }}
    kapp.k14s.io/change-group.{{ $scope }}: "autodevops/{{ $scope }}.{{ $val.global.namespace }}"
    {{- end }}
    {{- range $need := $run.needs }}
    kapp.k14s.io/change-rule.{{ $need }}: "upsert after upserting autodevops/{{ $need }}.{{ $val.global.namespace }}"
    {{- end }}
    janitor/ttl: 1800
spec:
  backoffLimit: 3
  activeDeadlineSeconds: 3600
  ttlSecondsAfterFinished: 1800
  template:
    metadata:
      annotations: {}
      labels: {}
    spec:
      restartPolicy: Never
      initContainers:
      {{- if or (not (hasKey $run "checkout")) $run.checkout }}
        - name: degit-repository
          image: node:17
          env:
            - name: npm_config_cache
              value: /tmp/npm-cache
          command:
            - sh
            - -c
            - |
              npx degit {{ or $val.repository $val.global.repository }}#{{ or $val.branchName $val.global.branchName }} \
                /workspace
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
            fsGroup: {{ or $run.fsGroup (or $run.user "1000") }}
          volumeMounts:
            - name: workspace
              mountPath: /workspace
      {{- end }}
      {{- if $run.action }}
        - name: degit-action
          image: node:17
          env:
            - name: npm_config_cache
              value: /tmp/npm-cache
          command:
            - sh
            - -c
            - npx degit {{ $run.action | replace "@" "#" }} /action
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
            fsGroup: {{ or $run.fsGroup (or $run.user "1000") }}
          volumeMounts:
            - name: action
              mountPath: /action
      {{- end }}
      containers:          
        - name: job
          image: "{{ or $run.image "alpine:3" }}"
          imagePullPolicy: IfNotPresent
          {{- if $run.envFrom }}
          envFrom: {{ tpl ($run.envFrom | toJson) $ }}
          {{- end }}
          env:
            {{- if $run.env }}
              {{- tpl ($run.env | toYaml) $ | nindent 12 }}
            {{- end }}
            {{- range $name, $value := $run.vars }}
            - name: "{{ $name }}"
              value: "{{ tpl $value $ }}"
            {{- end }}
          
          {{- if $run.run }}
          command:
            - /bin/{{ or $run.shell "bash" }}
            - -c
            - |
              {{- nindent 90 (tpl $run.run $) }}
          {{- else if $run.action }}
          command:
            - /bin/{{ or $run.shell "bash" }}
            - -c
            - |
              /action/action.sh
          {{- end }}
          securityContext:
            runAsUser: {{ or $run.user "1000" }}
            runAsGroup: {{ or $run.group (or $run.user "1000") }}
            fsGroup: {{ or $run.fsGroup (or $run.user "1000") }}
          volumeMounts:
            - name: workspace
              mountPath: /workspace
            - name: action
              mountPath: /action
            - name: workflow
              mountPath: /workflow
              subPath: {{ $val.global.branchSlug }}/{{ $val.global.sha }}

      volumes:
        - name: workspace
          emptyDir: {}
        - name: action
          emptyDir: {}
        - name: workflow
          persistentVolumeClaim:
            claimName: jobs-shared-storage
        {{- if $run.volumes }}
          {{- tpl ($run.volumes | toYaml) $ | nindent 8 }}
        {{- end }}

{{- end -}}