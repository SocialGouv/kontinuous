const slackstream = require("slackstream")

module.exports = async (manifests, options, context) => {
  const { success, errors, config, logger } = context

  const { environment, event, gitBranch, repositoryName } = config

  if (event !== "pushed") {
    return
  }

  const { notifyWebhookUrlVarName = "KS_NOTIFY_WEBHOOK_URL" } = options

  const notifyWebhookUrl = process.env[notifyWebhookUrlVarName]

  if (!notifyWebhookUrl) {
    logger.debug(
      `env variable "${notifyWebhookUrlVarName}" not found, skipping notify slack or mattermost`
    )
    return
  }
  logger.debug("notify slack or mattermost")

  const stream = slackstream(notifyWebhookUrl)
  const deploymentMessage = []
  const deploymentName = environment === "dev" ? gitBranch : environment

  deploymentMessage.push(
    `${repositoryName} ${deploymentName} deployment ${
      success ? "success ✅" : "failed ❌"
    }`
  )

  if (success) {
    for (const manifest of manifests) {
      const { kind } = manifest
      if (kind !== "Ingress") {
        continue
      }
      const { spec } = manifest
      const host = spec.rules[0]?.host
      if (host) {
        deploymentMessage.push(`https://${host}`)
        break
      }
    }
  } else {
    deploymentMessage.push(
      new AggregateError(errors, "errors encountered during deployment").message
    )
    // if we're running through GitHub actions
    if (process.env.GITHUB_JOB) {
      deploymentMessage.push(
        `🔎 ${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      )
    }
  }

  await new Promise((resolve, reject) => {
    try {
      stream.write(deploymentMessage.join("\n"), null, resolve)
    } catch (err) {
      reject(err)
    }
  })
}
