// const image = "harbor.fabrique.social.gouv.fr/sre/kube-workflow:latest"
const image = "ghcr.io/socialgouv/kube-workflow:latest"
const checkoutImage = image

module.exports = ({
  namespace,
  name,
  args = [],
  checkout,
  repositoryUrl,
  ref,
}) => ({
  apiVersion: "batch/v1",
  kind: "Job",
  metadata: {
    name,
    namespace,
  },
  spec: {
    backoffLimit: 1,
    activeDeadlineSeconds: 3600,
    ttlSecondsAfterFinished: 1800,
    template: {
      spec: {
        restartPolicy: "Never",
        securityContext: {
          runAsUser: 1001,
          runAsGroup: 1001,
          fsGroup: 1001,
        },
        ...(checkout
          ? {
              initContainers: [
                {
                  name: "checkout",
                  image: checkoutImage,
                  command: [
                    "sh",
                    "-c",
                    `git clone --depth 1 ${repositoryUrl} --branch ${ref} --single-branch /workspace`,
                  ],
                  securityContext: {
                    runAsUser: 1001,
                    runAsGroup: 1001,
                  },
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
            imagePullPolicy: "IfNotPresent",
            args,
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
