const { ctx } = require("@modjo-plugins/core")

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
  deployKeyCiSecretName,
}) => {
  const config = ctx.require("config.project")

  const { pipelineImage, pipelineCheckoutImage } = config

  return {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name,
      namespace,
      labels: {
        "commit-sha": gitCommit,
      },
      annotations: {
        "webhook.kontinuous/gitBranch": gitBranch,
        "webhook.kontinuous/gitCommit": gitCommit,
        "webhook.kontinuous/repositoryUrl": repositoryUrl,
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
          terminationGracePeriodSeconds: 5,
          initContainers: [
            ...(checkout
              ? [
                  {
                    name: "checkout",
                    image: pipelineCheckoutImage,
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
              image: pipelineImage,
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
                  value:
                    gitCommit || "0000000000000000000000000000000000000000",
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
  }
}
