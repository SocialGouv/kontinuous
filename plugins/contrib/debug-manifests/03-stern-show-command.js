const kindIsWaitable = require("../lib/kind-is-waitable")

module.exports = async (manifests, options, context) => {
  const { ctx, config } = context

  const logger = ctx.require("logger")

  const { deploymentLabelKey, deploymentLabelValue } = config

  logger.debug(`🐝 get stern https://github.com/stern/stern`)
  logger.debug("👁️  get logs commands using stern:")

  const log = logger.child({}, { indentation: 2 })
  log.setFields({})

  const selectorsByNs = []
  for (const manifest of manifests) {
    const { kind } = manifest
    if (!kindIsWaitable(kind, options.customWaitableKinds)) {
      continue
    }
    const resourceName = manifest.metadata.labels?.["kontinuous/resourceName"]
    const namespace = manifest.metadata?.namespace

    if (!resourceName) {
      continue
    }

    const labelSelectors = []
    labelSelectors.push(`kontinuous/resourceName=${resourceName}`)
    if (deploymentLabelValue) {
      labelSelectors.push(`${deploymentLabelKey}=${deploymentLabelValue}`)
    }
    const selector = labelSelectors.join(",")

    if (!selectorsByNs[namespace]) {
      selectorsByNs[namespace] = []
    }
    selectorsByNs[namespace].push({ selector, name: manifest.metadata.name })
  }

  for (const [namespace, selectors] of Object.entries(selectorsByNs)) {
    log.debug(
      `🌍 stern -n ${namespace} -l ${deploymentLabelKey}=${deploymentLabelValue}`
    )
    for (const { selector, name } of selectors) {
      log.debug(`🎯 ${name}: stern -n ${namespace} -l ${selector}`)
    }
  }
}
