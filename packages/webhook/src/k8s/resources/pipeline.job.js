const { ctx } = require("@modjo/core")

const gitSshCommand = require("~common/utils/git-ssh-command")
const castArray = require("~common/utils/cast-array")

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
  chart,
  ignoreProjectTemplates,
  kontinuousVersion,
  mountKubeconfig,
  serviceAccountName,
  mountSecrets,
}) => {
  const config = ctx.require("config")
  const projectConfig = config.project

  const {
    mountKubeconfigDefault,
    serviceAccountNameDefault,
    mountSecretsDefault,
    kubeconfigSecretName = "kubeconfig",
  } = projectConfig.ciNamespace

  if (mountKubeconfig === undefined || mountKubeconfig === null) {
    mountKubeconfig = mountKubeconfigDefault
  }
  if (mountKubeconfig === "false") {
    mountKubeconfig = false
  }
  if (ignoreProjectTemplates === "false") {
    ignoreProjectTemplates = false
  }

  if (serviceAccountName === undefined || serviceAccountName === null) {
    serviceAccountName = serviceAccountNameDefault
  }

  mountSecrets = [...mountSecretsDefault, ...castArray(mountSecrets)]
  const mountSecretsEnvFroms = mountSecrets.map((secretName) => ({
    secretRef: {
      name: secretName,
    },
  }))

  const { pipelineImage, pipelineCheckoutImage } = projectConfig
  let { pipelineImageTag, pipelineCheckoutImageTag } = projectConfig

  if (kontinuousVersion) {
    pipelineImageTag = kontinuousVersion
    pipelineCheckoutImageTag = kontinuousVersion
  }

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
          ...(serviceAccountName ? { serviceAccountName } : {}),
          initContainers: [
            ...(checkout
              ? [
                  {
                    name: "checkout",
                    image: `${pipelineCheckoutImage}:${pipelineCheckoutImageTag}`,
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
              image: `${pipelineImage}:${pipelineImageTag}`,
              imagePullPolicy: "Always",
              args,
              envFrom: [...mountSecretsEnvFroms],
              env: [
                {
                  name: "KS_WORKSPACE_PATH",
                  value: "/workspace",
                },
                {
                  name: "KS_CI",
                  value: "kontinuous-webhook",
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
                  name: "KS_GIT_REPOSITORY",
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
                ...(mountKubeconfig
                  ? [
                      {
                        name: "KUBECONFIG",
                        value: "/secrets/kubeconfig/cluster",
                      },
                    ]
                  : []),
                ...(deployKeyCiSecretName
                  ? [
                      {
                        name: "KS_DEPLOY_KEY_FILE",
                        value: "/secrets/ssh/deploy-key",
                      },
                    ]
                  : []),
                ...(chart
                  ? [
                      {
                        name: "KS_CHART",
                        value: chart,
                      },
                    ]
                  : []),
                ...(ignoreProjectTemplates
                  ? [
                      {
                        name: "KS_IGNORE_PROJECT_TEMPLATES",
                        value: "true",
                      },
                    ]
                  : []),
              ],
              volumeMounts: [
                {
                  name: "workspace",
                  mountPath: "/workspace",
                },
                ...(mountKubeconfig
                  ? [
                      {
                        name: "kubeconfig",
                        mountPath: "/secrets/kubeconfig",
                      },
                    ]
                  : []),
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
            ...(mountKubeconfig
              ? [
                  {
                    name: "kubeconfig",
                    secret: {
                      secretName: kubeconfigSecretName,
                      items: [
                        {
                          key: "KUBECONFIG",
                          path: "cluster",
                        },
                      ],
                    },
                  },
                ]
              : []),
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
