const imageBase = "ghcr.io/socialgouv"
// const imageBase = "harbor.fabrique.social.gouv.fr/sre"
const image = `${imageBase}/kube-workflow:latest`
const checkoutImage = `${imageBase}/kube-workflow/degit:latest`

const slug = require("~common/utils/slug")

module.exports = ({
  namespace,
  name,
  args = [],
  checkout,
  repositoryUrl,
  gitBranch,
  gitCommit,
  uploadUrl,
}) => ({
  apiVersion: "batch/v1",
  kind: "Job",
  metadata: {
    name,
    namespace,
    labels: {
      "kubeworkflow/gitCommit": gitCommit,
      "kubeworkflow/gitBranchSlug": slug(gitBranch),
      "kubeworkflow/repositoryUrlSlug": slug(repositoryUrl),
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
                name: "GIT_REPOSITORY_URL",
                value: repositoryUrl,
              },
              {
                name: "GIT_REF",
                value: gitBranch,
              },
              {
                name: "GIT_SHA",
                value: gitCommit,
              },
              ...(uploadUrl
                ? [{ name: "KUBEWORKFLOW_BUILD_UPLOAD_URL", value: uploadUrl }]
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
