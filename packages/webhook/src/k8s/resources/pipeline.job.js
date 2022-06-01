// const image = "ghcr.io/socialgouv/kube-workflow:latest"
// const checkoutImage = "ghcr.io/socialgouv/kube-workflow/degit:latest"

const image = "harbor.fabrique.social.gouv.fr/sre/kontinuous:latest"
const checkoutImage =
  "harbor.fabrique.social.gouv.fr/sre/kontinuous/degit:latest"

module.exports = ({
  namespace,
  name,
  args = [],
  checkout,
  repositoryUrl,
  gitBranch,
  gitCommit,
  uploadUrl,
  webhookUri,
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
        ...(checkout
          ? {
              initContainers: [
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
              ],
            }
          : {}),
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
              {
                name: "KS_GIT_REF",
                value: gitBranch,
              },
              {
                name: "KS_GIT_SHA",
                value: gitCommit,
              },
              ...(uploadUrl
                ? [{ name: "KS_BUILD_UPLOAD_URL", value: uploadUrl }]
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
