// const image = "ghcr.io/socialgouv/kube-workflow:latest"
// const checkoutImage = "ghcr.io/socialgouv/kube-workflow/degit:latest"

// const image = "harbor.fabrique.social.gouv.fr/sre/kontinuous:v1"
const image = "ghcr.io/socialgouv/kontinuous:1"
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
  project,
  webhookUri,
  webhookToken,
  initContainers = [],
  commits,
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
    backoffLimit: 0,
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
                    `degit ${repositoryUrl}#${
                      gitCommit &&
                      gitCommit !== "0000000000000000000000000000000000000000"
                        ? gitCommit
                        : "HEAD"
                    } /workspace`,
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
                name: "KS_WEBHOOK_TOKEN",
                value: webhookToken,
              },
              {
                name: "KS_PROJECT_NAME",
                value: project,
              },
              {
                name: "KS_GIT_REPOSITORY_URL",
                value: repositoryUrl,
              },
              ...(env
                ? [
                    {
                      name: "KS_ENVIRONMENT",
                      value: env,
                    },
                  ]
                : []),
              {
                name: "KS_GIT_REF",
                value: gitBranch,
              },
              {
                name: "KS_GIT_SHA",
                value: gitCommit || "0000000000000000000000000000000000000000",
              },
              {
                name: "KS_DEBUG",
                value: "true",
              },
              {
                name: "KS_BUILD_UPLOAD",
                value: "true",
              },
              ...(commits
                ? [
                    {
                      name: "KS_COMMITS",
                      value: JSON.stringify(commits),
                    },
                  ]
                : []),
              {
                name: "KUBECONFIG",
                value: "/secrets/kubeconfig/cluster",
              },
            ],
            volumeMounts: [
              {
                name: "workspace",
                mountPath: "/workspace",
              },
              {
                name: "kubeconfig",
                mountPath: "/secrets/kubeconfig",
              },
            ],
          },
        ],
        volumes: [
          { name: "workspace", emptyDir: {} },
          {
            name: "kubeconfig",
            secret: {
              secretName: "kubeconfig",
              items: [
                {
                  key: "KUBECONFIG",
                  path: "cluster",
                },
              ],
            },
          },
        ],
      },
    },
  },
})
