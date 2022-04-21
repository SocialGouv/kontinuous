const image = "harbor.fabrique.social.gouv.fr/sre/kube-workflow:latest"
// const image = "ghcr.io/socialgouv/kube-workflow:latest"
const checkoutImage = image

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
                    `git clone --depth 1 ${repositoryUrl} --branch ${gitBranch} /workspace`,
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
