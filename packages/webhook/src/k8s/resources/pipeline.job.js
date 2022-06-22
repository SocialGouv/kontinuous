// const image = "ghcr.io/socialgouv/kube-workflow:latest"
// const checkoutImage = "ghcr.io/socialgouv/kube-workflow/degit:latest"

const image = "harbor.fabrique.social.gouv.fr/sre/kontinuous:v1"
const checkoutImage = "harbor.fabrique.social.gouv.fr/sre/kontinuous/degit:v1"

module.exports = ({
  namespace,
  name,
  args = [],
  checkout,
  repositoryUrl,
  env,
  gitBranch,
  gitCommit,
  uploadUrl,
  statusUrl,
  webhookUri,
  initContainers = [],
}) => ({
  apiVersion: "batch/v1",
  kind: "Job",
  metadata: {
    name,
    namespace,
    labels: {
      "commit-sha": gitCommit,
    },
    annotations: {
      "kubeworkflow/gitBranch": gitBranch,
      "kubeworkflow/gitCommit": gitCommit,
      "kubeworkflow/repositoryUrl": repositoryUrl,
    },
  },
  spec: {
    backoffLimit: 2,
    activeDeadlineSeconds: 3600,
    ttlSecondsAfterFinished: 1800,
    template: {
      metadata: {
        labels: {
          "commit-sha": gitCommit,
        },
      },
      spec: {
        restartPolicy: "Never",
        initContainers: [
          ...(checkout
            ? [
                {
                  name: "checkout",
                  image: checkoutImage,
                  command: [
                    "sh",
                    "-c",
                    `degit ${repositoryUrl}#${gitCommit} /workspace`,
                  ],
                  volumeMounts: [
                    {
                      name: "workspace",
                      mountPath: "/workspace",
                    },
                  ],
                },
              ]
            : []),
          ...initContainers,
        ],
        containers: [
          {
            name: "pipeline",
            image,
            imagePullPolicy: "Always",
            args,
            envFrom: [
              {
                secretRef: {
                  name: "kubeconfig",
                },
              },
            ],
            env: [
              {
                name: "KS_WORKSPACE_PATH",
                value: "/workspace",
              },
              {
                name: "KS_CI_NAMESPACE",
                value: namespace,
              },
              {
                name: "KS_WEBHOOK_URI",
                value: webhookUri,
              },
              {
                name: "KS_GIT_REPOSITORY_URL",
                value: repositoryUrl,
              },
              ...(env ? [{ name: "KS_ENVIRONMENT", value: env }] : []),
              {
                name: "KS_GIT_REF",
                value: gitBranch,
              },
              {
                name: "KS_GIT_SHA",
                value: gitCommit,
              },
              {
                name: "KS_DEBUG",
                value: "true",
              },
              ...(uploadUrl
                ? [
                    { name: "KS_BUILD_UPLOAD", value: "true" },
                    { name: "KS_BUILD_UPLOAD_URL", value: uploadUrl },
                  ]
                : []),
              ...(statusUrl
                ? [{ name: "KS_DEPLOY_STATUS_URL", value: statusUrl }]
                : []),
            ],
            volumeMounts: [
              {
                name: "workspace",
                mountPath: "/workspace",
              },
            ],
          },
        ],
        volumes: [{ name: "workspace", emptyDir: {} }],
      },
    },
  },
})
