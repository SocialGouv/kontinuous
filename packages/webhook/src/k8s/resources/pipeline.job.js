// const image = "ghcr.io/socialgouv/kube-workflow:latest"
// const checkoutImage = "ghcr.io/socialgouv/kube-workflow/degit:latest"

const image = "harbor.fabrique.social.gouv.fr/sre/kube-workflow:latest"
const checkoutImage =
  "harbor.fabrique.social.gouv.fr/sre/kube-workflow/degit:latest"

module.exports = ({
  namespace,
  name,
  args = [],
  checkout,
  repositoryUrl,
  gitBranch,
  gitCommit,
  uploadUrl,
  baseDomain,
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
                name: "KW_BASE_DOMAIN",
                value: baseDomain,
              },
              {
                name: "KW_GIT_REPOSITORY_URL",
                value: repositoryUrl,
              },
              {
                name: "KW_GIT_REF",
                value: gitBranch,
              },
              {
                name: "KW_GIT_SHA",
                value: gitCommit,
              },
              ...(uploadUrl
                ? [{ name: "KW_BUILD_UPLOAD_URL", value: uploadUrl }]
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
