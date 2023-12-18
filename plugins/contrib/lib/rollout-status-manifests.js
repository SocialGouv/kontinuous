const { setTimeout } = require("timers/promises")
const kindIsWaitable = require("./kind-is-waitable")

const waitBeforeStopAllRolloutStatus = 5000 // try to collect more errors if there is any

/**
 *
 * @param {Kontinuous.Patch.Context} context
 * @param {{customWaitableKinds: Kontinuous.Manifest["kind"][]}} arg1
 * @returns
 */
module.exports = async (context, { customWaitableKinds }) => {
  const { config, logger, rolloutStatus, utils, manifests, ctx, kubectl } =
    context

  const eventsBucket = ctx.require("eventsBucket")

  const { waitForResource, promiseAll } = utils

  let endAllTrigerred = false
  const endAll = async () => {
    if (endAllTrigerred) {
      return
    }
    endAllTrigerred = true
    await setTimeout(waitBeforeStopAllRolloutStatus)
  }

  const { deploymentLabelKey } = config

  const {
    kubeconfig,
    kubeconfigContext: kubecontext,
    surviveOnBrokenCluster,
  } = config

  const promises = []
  for (const manifest of manifests) {
    const { kind } = manifest
    if (!kindIsWaitable(kind, customWaitableKinds)) {
      continue
    }
    const resourceName = manifest.metadata.labels?.["kontinuous/resourceName"]
    const deploymentLabelValue = manifest.metadata?.labels?.[deploymentLabelKey]
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

    promises.push(
      new Promise(async (resolve, reject) => {
        try {
          logger.debug(
            { namespace, selector },
            `watching resource: ${resourceName}`
          )
          const eventParam = { namespace, resourceName, selector }
          eventsBucket.emit("resource:waiting", eventParam)
          const abortSignal = ctx.require("abortSignal")
          const result = await waitForResource({
            namespace,
            kind,
            kubectl,
            selector,
            abortSignal,
            kubeconfig,
            kubecontext,
            surviveOnBrokenCluster,
            logger,
            rolloutStatus,
          })

          if (result.success) {
            logger.debug(
              { namespace, selector },
              `resource "${resourceName}" ready`
            )
            eventsBucket.emit("resource:ready", eventParam)
          } else if (result.error?.code || result.error?.reason) {
            logger.error(
              {
                namespace,
                selector,
                error: result.error,
              },
              `resource "${resourceName}" failed`
            )
            eventsBucket.emit("resource:failed", eventParam)
            endAll()
          } else {
            eventsBucket.emit("resource:closed", eventParam)
          }

          resolve({
            ...result,
            namespace,
            selector,
          })
        } catch (err) {
          reject(err)
        }
      })
    )
  }

  const optionalField = (err, field) =>
    err[field] ? `${field}: ${err[field]}` : ""
  const errorFields = ["code", "type", "message", "log"]

  return new Promise(async (resolve, reject) => {
    try {
      const results = await promiseAll(promises)
      const errors = []
      for (const result of results) {
        if (result.success !== true && result.error?.code) {
          errors.push(result)
        }
      }
      if (errors.length) {
        // for (const errorData of errors) {
        //   logger.error(
        //     {
        //       code: errorData.code,
        //       type: errorData.type,
        //       log: errorData.log,
        //       message: errorData.message,
        //     },
        //     `rollout-status ${errorData.code} error: ${errorData.message}`
        //   )
        // }
        throw new AggregateError(
          errors.map(
            ({ error, namespace, selector }) =>
              new Error(
                `${errorFields
                  .map((field) => optionalField(error, field))
                  .join(
                    ", "
                  )} on namespace="${namespace}" selector="${selector}"`
              )
          ),
          "rollout-status error"
        )
      }
      resolve(true)
    } catch (err) {
      reject(err)
    }
  })
}
