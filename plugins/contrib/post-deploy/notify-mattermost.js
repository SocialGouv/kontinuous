const slackstream = require("slackstream")

module.exports = async (manifests, options, context) => {
  const { success, errors, config, logger } = context

  const { environment } = config

  const { notifyWebhookUrlVarName = "NOTIFY_WEBHOOK_URL" } = options

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

  deploymentMessage.push(
    `${environment} deployment ${success ? "success ✅" : "failed ❌"}`
  )

  if (success) {
    const firstIngress = manifests.find(({ kind }) => kind === "Ingress")
    if (firstIngress) {
      const host = firstIngress.spec.rules[0]?.host
      if (host) {
        deploymentMessage.push(`https://${host}`)
      }
    }
  } else {
    deploymentMessage.push(
      new AggregateError(errors, "errors encountered during deployment").message
    )
  }

  await new Promise((resolve, reject) => {
    try {
      stream.write(deploymentMessage.join("\n"), null, resolve)
    } catch (err) {
      reject(err)
    }
  })
}
