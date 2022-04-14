const image = "harbor.fabrique.social.gouv.fr/sre/kube-workflow:latest"
// const image = "ghcr.com/socialgouv/kube-workflow:latest"

const checkoutImage = "node:17"

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
        ...(checkout
          ? {
              initContainers: [
                {
                  name: "checkout",
                  image: checkoutImage,
                  env: [
                    {
                      name: "npm_config_cache",
                      value: "/tmp/npm-cache",
                    },
                  ],
                  command: [
                    "sh",
                    "-c",
                    `npx degit ${repositoryUrl}#${ref} /workspace`,
                  ],
                  securityContext: {
                    runAsUser: 1000,
                    runAsGroup: 1000,
                  },
                  volumeMounts: {
                    name: "workspace",
                    mountPath: "/workspace",
                  },
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
            volumeMounts: {
              name: "workspace",
              mountPath: "/workspace",
            },
          },
        ],
        volumes: [{ name: "workspace", emptyDir: {} }],
      },
    },
  },
})
