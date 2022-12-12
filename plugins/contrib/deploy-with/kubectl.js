const async = require("async")

const getDeps = require("../lib/get-needs-deps")

const rolloutStatus = require("../lib/rollout-status")

const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

const isNotDefined = (val) => val === undefined || val === null || val === ""
const defaultTo = (val, defaultVal) => (isNotDefined(val) ? defaultVal : val)

module.exports = async (deploys, options, context) => {
  const { config, utils, manifests, dryRun } = context

  const { yaml, kubectlRetry, logger, kubectlDeleteManifest } = utils

  const { kubeconfigContext, kubeconfig, deployTimeout } = config

  const { serverSide = true, dependsOnEnabled = false } = options

  logger.debug(`dependsOnEnabled: ${dependsOnEnabled}`)

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
      --timeout=${deployTimeout}
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

  const { kindIsRunnable, KontinuousPluginError, rolloutStatusWatch } = utils
  const { kubernetesMethod = "kubeconfig" } = options
  const { serviceAccountName = "kontinuous-sa" } = options
  const deps = getDeps(manifests, context)

  const runWaitNeeds = async ({ waitNeeds, annotationsRef, timeout = 900 }) => {
    console.log(` .   => waiting needs: ${JSON.stringify(waitNeeds)}`)
    const interceptor = {}

    setTimeout(() => {
      interceptor.stop = true
      setTimeout(() => {
        process.exit(1)
      }, 1000)
    }, timeout * 1000)

    const completedOnceAnnotationKey = "kontinuous/completedOnce"

    const [selfRefNamespace, selfRefKind, selfRefName] =
      annotationsRef.split("/")
    const lowerkind = selfRefKind.toLowerCase()
    const getSelfRefAnnotations = async () => {
      const annotationsJSON = await kubectlRetry(
        `-n ${selfRefNamespace} get ${lowerkind}/${selfRefName} -o json`,
        {
          logInfo: false,
          retryOptions: kubectlRetryOptions,
          surviveOnBrokenCluster,
        }
      )
      const manifest = JSON.parse(annotationsJSON)
      const { annotations = {} } = manifest.metadata
      return annotations
    }

    const annotations = await getSelfRefAnnotations()

    const deploymentSelector = annotations["kontinuous/deployment"]

    const annotateCompletedOnce = async () => {
      await kubectlRetry(
        `-n ${selfRefNamespace} annotate ${lowerkind}/${selfRefName} ${completedOnceAnnotationKey}=${deploymentSelector} --overwrite`,
        {
          kubectlRetryOptions,
          surviveOnBrokenCluster,
        }
      )
    }

    const completedOnce =
      annotations[completedOnceAnnotationKey] === deploymentSelector
    logger.info(`completedOnce: ${completedOnce}`)

    const promises = []
    for (const { namespace, selectors, needOnce } of waitNeeds) {
      const selector = Object.entries(selectors)
        .map(([label, value]) => `${label}=${value}`)
        .join(",")

      if (needOnce && completedOnce) {
        continue
      }

      promises.push(
        new Promise(async (resolve, reject) => {
          try {
            logger.info({ namespace, selector }, `watching`)
            const result = await rolloutStatusWatch({
              namespace,
              selector,
              interceptor,
              // rolloutStatusProcesses,
              // kubeconfig,
              // kubecontext,
              logger,
            })
            if (result.error) {
              result.error.selector = selector
            }
            resolve(result)
          } catch (err) {
            reject(err)
          }
        })
      )
    }

    const results = await Promise.allSettled(promises)
    const errors = []
    for (const result of results) {
      const { status } = result
      if (status === "rejected") {
        const { reason } = result
        if (reason instanceof Error) {
          errors.push(reason.message)
        } else {
          errors.push(reason)
        }
      } else if (status === "fulfilled") {
        const { value } = result
        if (value.success !== true) {
          errors.push(value.error)
        }
      } else {
        logger.fatal({ result }, `unexpected promise result`)
      }
    }
    if (errors.length > 0) {
      logger.error({ errors }, "required dependencies could not be satisfied")
      return false
    }
    logger.info("all dependencies are ready")
    await annotateCompletedOnce()
    return true
  }

  const waitForDendencies = async (manifest) => {
    // ---- needs-using-initcontainers

    const { metadata, kind } = manifest
    const annotations = metadata?.annotations
    if (!annotations) {
      return
    }

    const jsonNeeds = annotations["kontinuous/plugin.needs"]
    // if (annotations["kontinuous/plugin.needs"]) {
    //   delete annotations["kontinuous/plugin.needs"]
    // }

    if (!kindIsRunnable(kind)) {
      return
    }
    if (!jsonNeeds) {
      return
    }
    const needs = JSON.parse(jsonNeeds)
    const needsManifests = new Set()
    for (const need of needs) {
      const matchingDeps = deps[need]
      if (matchingDeps.length === 0) {
        const msg = `could not find dependency "${need}" for kind "${kind}" name "${metadata.name}" on namespace "${metadata.namespace}"`
        logger.error({ need }, msg)
        throw new KontinuousPluginError(msg)
      }
      needsManifests.add(...matchingDeps)
    }

    const { spec } = manifest.spec.template

    if (
      (!spec.serviceAccountName || spec.serviceAccountName === "default") &&
      kubernetesMethod === "serviceaccount"
    ) {
      spec.serviceAccountName = serviceAccountName
    }

    if (kind === "Deployment") {
      manifest.spec.progressDeadlineSeconds =
        options.progressDeadlineSeconds || 1200000 // 20 minutes
    }

    const dependencies = [...needsManifests].map((m) => {
      const { namespace, labels, name } = m.metadata
      const resourceName = labels["kontinuous/resourceName"]
      const selectors = { "kontinuous/resourceName": resourceName }
      return {
        namespace,
        kind: m.kind,
        name,
        selectors,
        needOnce: m.kind === "Job",
      }
    })

    // ------- wait-needs
    const annotationsRef = [
      manifest.metadata.namespace,
      kind,
      manifest.metadata.name,
    ].join("/")
    let timeout = process.env.TIMEOUT
    if (timeout) {
      timeout = parseInt(timeout, 10)
    } else {
      timeout = undefined
    }
    return runWaitNeeds({
      waitNeeds: dependencies,
      annotationsRef,
      timeout,
    })
  }

  const processManifest = async (manifest) => {
    console.log(
      `   [${manifest.kind}: ${manifest.metadata.name}]: loading manifest`
    )
    if (dependsOnEnabled) {
      console.log(
        `   [${manifest.kind}: ${manifest.metadata.name}]: waiting for dependencies`
      )
      await waitForDendencies(manifest)
    }

    console.log(
      `   [${manifest.kind}: ${manifest.metadata.name}]: applying manifest`
    )
    const result = await applyManifest(manifest)

    console.log(
      `   [${manifest.kind}: ${manifest.metadata.name}]: done! result="${result}"`
    )
    return result
  }

  const applyPromise = !dryRun
    ? async.mapLimit(manifests, applyConcurrencyLimit, processManifest)
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
