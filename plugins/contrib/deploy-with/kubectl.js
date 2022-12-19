const async = require("async")

const rolloutStatus = require("../lib/rollout-status")

const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

const isNotDefined = (val) => val === undefined || val === null || val === ""
const defaultTo = (val, defaultVal) => (isNotDefined(val) ? defaultVal : val)

module.exports = async (deploys, options, context) => {
  const { config, utils, manifests, dryRun, needBin } = context

  const {
    yaml,
    kubectlRetry,
    logger,
    kubectlDeleteManifest,
    kindIsRunnable,
    needKubectl,
  } = utils

  await needBin(needKubectl)

  const { kubeconfigContext, kubeconfig } = config

  const { applyTimeout = "2m" } = options

  const { serverSide = true } = options

  const defaultOptions = {
    validate: true,
    force: true,
    recreate: false,
    applyConcurrencyLimit: 1,
  }

  const force = defaultTo(options.force, defaultOptions.force)
  const recreate = defaultTo(options.recreate, defaultOptions.recreate)
  const forceConflicts = defaultTo(options.forceConflicts, true)
  const applyConcurrencyLimit = defaultTo(
    options.applyConcurrencyLimit,
    defaultOptions.applyConcurrencyLimit
  )
  const validate = defaultTo(
    options.validate,
    !config.noValidate && defaultOptions.validate
  )

  const kubectlRetryOptions = {
    retries: 10,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 15000,
    randomize: true,
  }

  const { surviveOnBrokenCluster = false } = options

  const kubectlProcesses = []
  const kubectlDeleteManifestOptions = {
    rootDir: config.buildPath,
    kubeconfig,
    kubeconfigContext,
    retryOptions: kubectlRetryOptions,
    surviveOnBrokenCluster,
  }

  const forceAnnotationKey = "kontinuous/kubectl-force"
  const getForceThisResource = (manifest) => {
    const manifestsForceResourceOption =
      manifest.metadata?.annotations?.[forceAnnotationKey]
    return defaultTo(manifestsForceResourceOption, force)
  }

  const recreateAnnotationKey = "kontinuous/kubectl-recreate"
  const getRecreateThisResource = (manifest) => {
    if (manifest.kind === "Job") {
      return true
    }
    const manifestsRecreateResourceOption =
      manifest.metadata?.annotations?.[recreateAnnotationKey]
    return defaultTo(manifestsRecreateResourceOption, recreate)
  }

  const kubectlApplyManifest = async (manifest) => {
    const yamlManifest = yaml.dump(manifest)
    const forceThisResource = getForceThisResource(manifest)
    const kubectlDeployCommand = `
      apply
      -f -
      --force=${forceThisResource && !serverSide ? "true" : "false"}
      --validate=${validate ? "true" : "false"}
      --server-side=${serverSide ? "true" : "false"}
      --force-conflicts=${serverSide && forceConflicts ? "true" : "false"}
      --overwrite
      --wait
      --timeout=${applyTimeout}
  `
    return kubectlRetry(kubectlDeployCommand, {
      kubeconfig,
      kubeconfigContext,
      stdin: yamlManifest,
      collectProcesses: kubectlProcesses,
      logInfo: true,
      logError: false,
      retryOptions: kubectlRetryOptions,
      surviveOnBrokenCluster,
    })
  }

  const forceApply = async (manifest) => {
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
    const recreateThisResource = getRecreateThisResource(manifest)
    try {
      if (recreateThisResource) {
        await kubectlDeleteManifest(manifest, kubectlDeleteManifestOptions)
      }
      result = await kubectlApplyManifest(manifest)
    } catch (err) {
      if (err.message.includes("field is immutable")) {
        return handleFieldIsImmutableError(manifest, err)
      }
      throw err
    }
    return result
  }

  const { runContext } = context
  const { eventsBucket } = runContext
  const countAllRunnable = manifests.filter((manifest) =>
    kindIsRunnable(manifest.kind)
  ).length
  eventsBucket.trigger("initDeployment", { countAllRunnable })

  const applyPromise = !dryRun
    ? async.mapLimit(manifests, applyConcurrencyLimit, applyManifest)
    : null

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
      if (!dryRun) {
        await applyPromise
        const { stop, promise: rolloutStatusPromise } = await rolloutStatus(
          context
        )
        stopRolloutStatus = stop
        await rolloutStatusPromise
      }
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
