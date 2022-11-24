{{- define "contrib-helpers.job" -}}

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
    kontinuous/needsName: "{{ $run.name }}"
    {{- if $run.stage }}
    kontinuous/plugin.stage: {{ $run.stage | quote }}
    {{- end }}
    kontinuous/needsNames: {{ $run.scopes | toJson | quote }}
    # kontinuous/needsNames: {{ $run.needsNames | toJson | quote }}
    {{- if $run.needs }}
    kontinuous/plugin.needs: {{ $run.needs | toJson | quote }}
    {{- end }}
    janitor/ttl: "7d"
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
  activeDeadlineSeconds: {{ or $run.activeDeadlineSeconds "3600" }}
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
      {{- if and (or (not (hasKey $run "checkout")) $run.checkout) (ne .Values.global.env "local") }}
        - name: degit-repository
          image: {{ .Values.degitImage }}
          imagePullPolicy: {{ .Values.degitImagePullPolicy }}
          command:
            - sh
            - -c
            - |
              {{ if .Values.deployKey.enabled }}
              export GIT_SSH_COMMAND="ssh -i /secrets/ssh/deploy-key -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"
              degit --verbose --mode=git {{ or $val.repository $val.global.repository }}#{{ or $val.gitBranch $val.global.gitBranch }} \
                /workspace
              {{ else }}
              degit {{ or $val.repository $val.global.repository }}#{{ or $val.gitBranch $val.global.gitBranch }} \
                /workspace
              {{ end }}
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
          volumeMounts:
            - name: workspace
              mountPath: /workspace
            {{ if .Values.deployKey.enabled }}
            - name: deploy-key
              mountPath: /secrets/ssh
              readOnly: true
            {{ end }}
          resources:
            limits:
              cpu: {{ or $run.degitRepositoryCpuLimit .Values.degitRepository.resources.limits.cpu }}
              memory: {{ or $run.degitRepositoryMemoryLimit .Values.degitRepository.resources.limits.memory }}
            requests:
              cpu: {{ or $run.degitRepositoryCpuRequest .Values.degitRepository.resources.requests.cpu }}
              memory: {{ or $run.degitRepositoryMemoryRequest .Values.degitRepository.resources.requests.memory }}
      {{- end }}
      {{- if and $run.action (ne .Values.global.env "local") }}
        - name: degit-action
          image: {{ .Values.degitImage }}
          command:
            - sh
            - -c
            - degit {{ $run.action | replace "@" "#" }} /action
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
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
            {{- if and $run.kubernetes (eq $run.kubernetesMethod "kubeconfig") }}
            - name: "KUBECONFIG"
              value: "/secrets/k8s/kubeconfig"
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
          volumeMounts:
            - name: workspace
              mountPath: /workspace
            - name: action
              mountPath: /action
            {{ if and .Values.deployKey.enabled (or $run.mountDeployKey .Values.mountDeployKey) }}
            - name: deploy-key
              mountPath: /secrets/ssh
              readOnly: true
            {{ end }}
            {{- if and $run.kubernetes (eq $run.kubernetesMethod "kubeconfig") }}
            - name: kubeconfig
              mountPath: /secrets/k8s
              readOnly: true
            {{ end }}
            {{/*
            - name: workflow
              mountPath: /workflow
              subPath: {{ $val.global.branchSlug }}/{{ $val.global.sha }}
            */}}
            {{- if $run.volumeMounts }}
            {{- tpl ($run.volumeMounts | toYaml) . | nindent 12 }}
            {{- end }}
      securityContext:
        fsGroup: {{ $fsGroup }}
      volumes:
        - name: workspace
          {{- if and (eq .Values.global.env "local") (or (not (hasKey $run "checkout")) $run.checkout) }}
          hostPath:
            path: {{ .Values.global.workspacePath }}
            type: Directory
          {{- else }}
          emptyDir: {}
          {{- end }}
        - name: action
          {{- if and (eq .Values.global.env "local") $run.localActionPath }}
          hostPath:
            path: {{ $run.localActionPath }}
            type: Directory
          {{- else }}
          emptyDir: {}
          {{- end }}
        {{ if .Values.deployKey.enabled }}
        - name: deploy-key
          secret:
            secretName: {{ .Values.deployKey.secretRefName }}
            items:
              - key: {{ .Values.deployKey.secretRefKey }}
                path: deploy-key
        {{ end }}
        {{- if and $run.kubernetes (eq $run.kubernetesMethod "kubeconfig") }}
        - name: kubeconfig
          secret:
            secretName: {{ .Values.kubeconfig.secretRefName }}
            items:
              - key: {{ .Values.kubeconfig.secretRefKey }}
                path: kubeconfig
        {{ end }}
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