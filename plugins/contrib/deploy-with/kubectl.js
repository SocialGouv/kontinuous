const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

const rolloutStatus = require("../lib/rollout-status")

const isNotDefined = (val) => val === undefined || val === null || val === ""
const defaultTo = (val, defaultVal) => (isNotDefined(val) ? defaultVal : val)

module.exports = async (deploys, options, context) => {
  const { config, utils, manifests, dryRun } = context

  const { yaml, kubectlRetry, logger } = utils

  const { kubeconfigContext, kubeconfig, deployTimeout } = config

  const { serverSide = true } = options

  const force = defaultTo(options.force, !dryRun)
  const forceConflicts = defaultTo(options.forceConflicts, !dryRun)
  const validate = defaultTo(options.validate, !config.noValidate)

  const kubectlProcesses = []
  const kubectlDeleteManifestOptions = {
    rootDir: config.buildPath,
    kubeconfig,
    kubeconfigContext,
  }

  const forceAnnotationKey = "kontinuous/kubectl-force"
  const getForceThisResource = (manifest) => {
    const manifestsForceResourceOption =
      manifest.metadata?.annotations?.[forceAnnotationKey]
    return defaultTo(manifestsForceResourceOption, force)
  }

  const kubectlApplyManifest = async (manifest) => {
    const yamlManifest = yaml.dump(manifest)
    const forceThisResource = getForceThisResource(manifest)
    const kubectlDeployCommand = `
    apply
      -f -
      ${dryRun ? "--dry-run=none" : ""}
      --force=${forceThisResource && !serverSide ? "true" : "false"}
      --validate=${validate ? "true" : "false"}
      --server-side=${serverSide ? "true" : "false"}
      --force-conflicts=${serverSide && forceConflicts ? "true" : "false"}
      --overwrite
      --wait
      --timeout=${deployTimeout}
  `
    return kubectlRetry(kubectlDeployCommand, {
      kubeconfig,
      kubeconfigContext,
      stdin: yamlManifest,
      collectProcesses: kubectlProcesses,
      logInfo: true,
      logError: false,
    })
  }
  const forceApply = async (manifest) => {
    const { kubectlDeleteManifest } = utils

    await kubectlDeleteManifest(manifest, kubectlDeleteManifestOptions)

    await kubectlApplyManifest(manifest)
  }

  const handleFieldIsImmutableError = async (manifest, err) => {
    const forceThisResource = getForceThisResource(manifest)
    const resourceName = `${manifest.kind} ${manifest.metadata.namespace}/${manifest.metadata.name}`
    if (!forceThisResource) {
      logger.error(
        { err },
        `💥 immutable field conflict error on "${resourceName}", to bypass this, enable force option on manifest using ${forceAnnotationKey} annotation or enable force globally on kubectl deploy-with plugin, caution, this will destroy and recreate resource`
      )
      throw err
    }
    logger.warn(
      `💥 delete resource "${resourceName}" before recreate to force immutable field conflict`
    )
    return forceApply(manifest, err)
  }

  const applyManifest = async (manifest) => {
    let result
    try {
      result = await kubectlApplyManifest(manifest)
    } catch (err) {
      if (err.message.includes("field is immutable")) {
        return handleFieldIsImmutableError(manifest, err)
      }
      throw err
    }
    return result
  }

  const kubectlPromises = manifests.map(applyManifest)

  let stopRolloutStatus

  for (const signal of signals) {
    process.on(signal, () => {
      for (const kubectlProc of kubectlProcesses) {
        kubectlProc.kill(signal)
      }
      if (stopRolloutStatus) {
        stopRolloutStatus()
      }
      process.exit(0)
    })
  }

  const promise = new Promise(async (resolve, reject) => {
    try {
      await Promise.all(kubectlPromises)
      if (dryRun) {
        resolve(true)
        return
      }
      const { stop, promise: rolloutStatusPromise } = await rolloutStatus(
        context
      )
      stopRolloutStatus = stop
      await rolloutStatusPromise
      resolve(true)
    } catch (err) {
      reject(err)
    }
  })

  const stopDeploy = async () => {
    try {
      for (const kubectlProc of kubectlProcesses) {
        process.kill(kubectlProc.pid, "SIGKILL")
      }
    } catch (_err) {
      // do nothing
    }
    if (stopRolloutStatus) {
      stopRolloutStatus()
    }
  }

  deploys.push({ promise, stopDeploy })
}

/*
reading:
  - https://github.com/kubernetes/kubernetes/issues/90931
    why --force is not supported with server-side apply (but we workaround to support this in this plugin)
  - https://kubernetes.io/blog/2022/10/20/advanced-server-side-apply/
  - https://medium.com/swlh/break-down-kubernetes-server-side-apply-5d59f6a14e26
  
*/
