{{- define "job" -}}

{{ $run := $.run }}
{{ $with := $.with }}
{{ $parentWith := $.parentWith }}
{{ $val := $.Values }}

{{ $user := "" }}
{{ if kindIs "invalid" $run.user }}
{{ $user = "1000" }}
{{ else }}
{{ $user = ($run.user | toString) }}
{{ end }}

{{ $group := "" }}
{{ if kindIs "invalid" $run.group }}
{{ $group = ($user | toString) }}
{{ else }}
{{ $group = $run.group }}
{{ end }}

{{ $fsGroup := "" }}
{{ if kindIs "invalid" $run.fsGroup }}
{{ $fsGroup = $user }}
{{ else }}
{{ $fsGroup = ($run.fsGroup | toString) }}
{{ end }}

---
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ $run.jobName }}
  {{ if $run.namespace }}
  namespace: {{ tpl $run.namespace $ }}
  {{ else }}
  namespace: {{ or $val.namespace $val.global.ciNamespace }}
  {{ end }}
  annotations:
    kapp.k14s.io/nonce: ""
    kapp.k14s.io/update-strategy: fallback-on-replace
    kapp.k14s.io/change-group: "kontinuous/{{ $val.global.namespace }}"
    {{- if $run.stage }}
    kapp.k14s.io/change-group.kontinuous-stage: "kontinuous/{{ $run.stage }}.{{ $val.global.namespace }}"
    {{- end }}
    {{- range $scope := $run.scopes }}
    kapp.k14s.io/change-group.{{ $scope }}: "kontinuous/{{ $scope }}.{{ $val.global.namespace }}"
    {{- end }}
    {{- range $need := $run.needs }}
    kapp.k14s.io/change-rule.{{ $need }}: "upsert after upserting kontinuous/{{ $need }}.{{ $val.global.namespace }}"
    {{- end }}
    janitor/ttl: "1800"
    {{- if $run.onChangedPaths }}
    kontinuous/onChangedPaths: |
      {{- range $val := $run.onChangedPaths }}
      - {{ (tpl $val $) | quote }}
      {{- end }}
    {{- end }}
    {{- if $run.onChangedNeeds }}
    kontinuous/onChangedNeeds: {{ $run.onChangedNeeds | quote }}
    {{- end }}
    {{- if $run.onChangedAnnotate }}
    kontinuous/onChangedAnnotate: "true"
    {{- end }}
spec:
  {{ if kindIs "invalid" $run.retry }}
  backoffLimit: 1
  {{ else }}
  backoffLimit: {{ $run.retry }}
  {{ end }}
  activeDeadlineSeconds: 3600
  ttlSecondsAfterFinished: 1800
  template:
    metadata:
      annotations:
      {{- if $run.annotations }}
      {{- range $key, $val := $run.annotations }}
        "{{ $key }}": "{{ $val }}"
      {{- end }}
      {{- end }}
      labels:
      {{- if $run.labels }}
      {{- range $key, $val := $run.labels }}
        "{{ $key }}": "{{ $val }}"
      {{- end }}
      {{- end }}
    spec:
      {{- if or $run.priorityClassName .Values.priorityClassName .Values.global.jobsConfig.priorityClassName }}
      priorityClassName: "{{ or $run.priorityClassName .Values.priorityClassName .Values.global.jobsConfig.priorityClassName }}"
      {{- end }}
      {{- if or $run.serviceAccountName .Values.serviceAccountName .Values.global.jobsConfig.serviceAccountName }}
      serviceAccountName: "{{ or $run.serviceAccountName .Values.serviceAccountName .Values.global.jobsConfig.serviceAccountName }}"
      {{- end }}
      restartPolicy: Never
      initContainers:
      {{- if or (not (hasKey $run "checkout")) $run.checkout }}
        - name: degit-repository
          image: {{ .Values.degitImage }}
          command:
            - sh
            - -c
            - |
              degit {{ or $val.repository $val.global.repository }}#{{ or $val.gitBranch $val.global.gitBranch }} \
                /workspace
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
            fsGroup: {{ or $run.fsGroup (or $run.user "1000") }}
          volumeMounts:
            - name: workspace
              mountPath: /workspace
          resources:
            limits:
              cpu: {{ or $run.degitRepositoryCpuLimit .Values.degitRepository.resources.limits.cpu }}
              memory: {{ or $run.degitRepositoryMemoryLimit .Values.degitRepository.resources.limits.memory }}
            requests:
              cpu: {{ or $run.degitRepositoryCpuRequest .Values.degitRepository.resources.requests.cpu }}
              memory: {{ or $run.degitRepositoryMemoryRequest .Values.degitRepository.resources.requests.memory }}
      {{- end }}
      {{- if $run.action }}
        - name: degit-action
          image: {{ .Values.degitImage }}
          command:
            - sh
            - -c
            - degit {{ $run.action | replace "@" "#" }} /action
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
            fsGroup: {{ or $run.fsGroup (or $run.user "1000") }}
          volumeMounts:
            - name: action
              mountPath: /action
          resources:
            limits:
              cpu: {{ or $run.degitActionCpuLimit .Values.degitAction.resources.limits.cpu }}
              memory: {{ or $run.degitActionMemoryLimit .Values.degitAction.resources.limits.memory }}
            requests:
              cpu: {{ or $run.degitActionCpuRequest .Values.degitAction.resources.requests.cpu }}
              memory: {{ or $run.degitActionMemoryRequest .Values.degitAction.resources.requests.memory }}
      {{- end }}
      containers:          
        - name: job
          image: "{{ tpl (or $run.image $.Values.image) $ }}"
          imagePullPolicy: IfNotPresent
          {{ if $run.image }}
          {{ if  $run.workingDir }}
          workingDir: "{{ $run.workingDir }}"
          {{- end }}
          {{ else }}
          workingDir: "{{ or $run.workingDir "/workspace" }}"
          {{- end }}
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
          
          {{- if or $run.entrypoint $run.run $run.action }}
          command:
            {{- if $run.entrypoint }}
            {{- tpl ($run.entrypoint | toYaml) $ | nindent 12 }}
            {{- else }}
            - /bin/{{ or $run.shell "bash" }}
            - -c
            {{- end }}
            {{- if or $run.run $run.action }}
            - |
              set -e
              {{- if $run.run }}
              {{- nindent 14 (tpl $run.run $) }}
              {{- else if $run.action }}
              /action/action.sh
              {{- end }}
            {{- end }}
          {{- end }}
          {{- if $run.args }}
          args:
          {{- range $arg := $run.args }}
            - "{{ tpl $arg $ }}"
          {{- end }}
          {{- end }}
          resources:
            limits:
              cpu: {{ or $run.cpuLimit .Values.resources.limits.cpu }}
              memory: {{ or $run.memoryLimit .Values.resources.limits.memory }}
            requests:
              cpu: {{ or $run.cpuRequest .Values.resources.requests.cpu }}
              memory: {{ or $run.memoryRequest .Values.resources.requests.memory }}
          securityContext:
            runAsUser: {{ $user }}
            runAsGroup: {{ $group }}
            fsGroup: {{ $fsGroup }}
          volumeMounts:
            - name: workspace
              mountPath: /workspace
            - name: action
              mountPath: /action
            {{/*
            - name: workflow
              mountPath: /workflow
              subPath: {{ $val.global.branchSlug }}/{{ $val.global.sha }}
            */}}
            {{- if $run.volumeMounts }}
            {{- tpl ($run.volumeMounts | toYaml) . | nindent 12 }}
            {{- end }}

      volumes:
        - name: workspace
          emptyDir: {}
        - name: action
          emptyDir: {}
        {{/*
        {{ if and .Values.global.extra.jobs.sharedStorage.enabled }}
        - name: workflow
          persistentVolumeClaim:
            claimName: jobs-shared-storage
        {{- end }}
        */}}
        {{- if $run.volumes }}
          {{- tpl ($run.volumes | toYaml) $ | nindent 8 }}
        {{- end }}

{{- end -}}