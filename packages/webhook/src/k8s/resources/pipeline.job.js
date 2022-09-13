const { ctx } = require("@modjo-plugins/core")

const gitSshCommand = require("~common/utils/git-ssh-command")

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
      ttlSecondsAfterFinished: 2 * 24 * 60 * 60,
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
                      `degit ${
                        deployKeyCiSecretName ? "--mode=git " : ""
                      }${repositoryUrl}#${
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
                      ...(deployKeyCiSecretName
                        ? [
                            {
                              name: "deployKey",
                              mountPath: "/secrets/ssh",
                            },
                          ]
                        : []),
                    ],
                    env: [
                      ...(deployKeyCiSecretName
                        ? [
                            {
                              name: "GIT_COMMAND_SSH",
                              value: gitSshCommand({
                                deployKey: "/secrets/ssh/deploy-key",
                              }),
                            },
                          ]
                        : []),
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
                ...(deployKeyCiSecretName
                  ? [
                      {
                        name: "KS_DEPLOY_KEY_FILE",
                        value: "/secrets/ssh/deploy-key",
                      },
                    ]
                  : []),
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
                ...(deployKeyCiSecretName
                  ? [
                      {
                        name: "deployKey",
                        mountPath: "/secrets/ssh",
                      },
                    ]
                  : []),
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
            ...(deployKeyCiSecretName
              ? [
                  {
                    name: "deployKey",
                    secretName: deployKeyCiSecretName,
                    items: [
                      {
                        key: "DEPLOY_KEY",
                        path: "deploy-key",
                      },
                    ],
                  },
                ]
              : []),
          ],
        },
      },
    },
  }
}
