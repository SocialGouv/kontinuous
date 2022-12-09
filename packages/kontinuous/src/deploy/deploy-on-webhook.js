const crypto = require("crypto")
const qs = require("qs")
const pick = require("lodash.pick")
const FormData = require("form-data")

const ctx = require("~common/ctx")
const validateMd5 = require("~common/utils/validate-md5")
const axios = require("~common/utils/axios-retry")
const handleAxiosError = require("~common/utils/handle-axios-error")

const logs = require("~/logs")
const { getStatus } = require("~/status")

module.exports = async ({
  options,
  manifests,
  repositoryName,
  environment,
  token,
  gitRepositoryUrl,
  webhookUri,
  statusUrl,
}) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")

  const manifestsHash = crypto.createHmac("md5", manifests).digest("hex")

  let jobHash
  if (options.jobHash) {
    if (validateMd5(options.jobHash)) {
      jobHash = options.jobHash
    } else {
      jobHash = crypto.createHmac("md5", options.jobHash).digest("hex")
    }
  } else {
    jobHash = manifestsHash
  }

  logger.info(
    `deploying via webhook ${repositoryName} job#${jobHash} manifests#md5:${manifestsHash}`
  )

  logger.info("uploading custom manifests to deploy")

  const form = new FormData()
  form.append("manifests", manifests, {
    filename: "manifests.yaml",
    contentType: "text/x-yaml",
  })
  form.append(
    "deployConfig",
    JSON.stringify(
      pick(config, [
        "deployWithPlugin",
        "gitRepositoryUrl",
        "gitRepository",
        "gitBranch",
        "gitSha",
        "gitRepositoryName",
        "repositoryName",
        "refLabelKey",
        "refLabelValue",
        "deploymentEnvLabelKey",
        "deploymentEnvLabelValue",
        "deploymentLabelKey",
        "deploymentLabelForceNewDeploy",
        "deploymentLabelValue",
        "dependencies",
        "config",
        "options",
      ])
    )
  )

  const query = qs.stringify({
    project: config.projectName,
    env: environment,
    hash: jobHash,
    repositoryUrl: gitRepositoryUrl,
    ...(config.webhhookServiceAccountName
      ? {
          serviceAccountName: config.webhhookServiceAccountName,
        }
      : {}),
    ...(config.webhookMountKubeconfig !== undefined
      ? {
          mountKubeconfig: config.webhookMountKubeconfig ? "true" : "false",
        }
      : {}),
    ...(config.webhhookMountSecrets && config.webhhookMountSecrets.length > 0
      ? {
          mountSecrets: JSON.stringify(config.webhhookMountSecrets),
        }
      : {}),
  })

  const url = `${webhookUri}/api/v1/oas/hooks/custom?${query}`
  try {
    const response = await axios.request({
      method: "POST",
      url,
      data: form,
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    })
    logger.debug(response.data)
    logger.info("uploaded custom manifests to deploy")
  } catch (error) {
    handleAxiosError(error, logger)
  }

  if (options.onWebhookDetach) {
    return
  }

  await logs({
    ...options,
    env: environment,
    event: "custom",
    repository: gitRepositoryUrl,
    branch: jobHash,
    commit: "0000000000000000000000000000000000000000",
  })
  if (statusUrl) {
    const { status, ok } = await getStatus({ url: statusUrl, token })
    if (ok !== true) {
      const errorMsg = `status not ok, it returned: ${status}`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }
  }
}
