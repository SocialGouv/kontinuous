const async = require("async")

const getDeps = require("../lib/get-needs-deps")

const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

const handledKinds = ["Deployment", "StatefulSet", "Job"]

const isNotDefined = (val) => val === undefined || val === null || val === ""
const defaultTo = (val, defaultVal) => (isNotDefined(val) ? defaultVal : val)

module.exports = async (deploys, options, context) => {
  const { config, utils, manifests, dryRun, runContext, needBin } = context

  const {
    yaml,
    kubectlRetry,
    logger,
    kubectlDeleteManifest,
    kindIsRunnable,
    KontinuousPluginError,
    rolloutStatusWatch,
    needRolloutStatus,
    needKubectl,
  } = utils

  await needBin(needKubectl)
  await needBin(needRolloutStatus)

  const { kubeconfigContext, kubeconfig } = config

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

  const { applyTimeout = "2m" } = options

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

  const { eventsBucket } = runContext

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
      { err },
      `💥 delete resource "${resourceName}" before recreate to force immutable field conflict`
    )
    return forceApply(manifest, err)
  }

  const applyManifestExec = async (manifest) => {
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

  const q = async.queue(async (manifest) => {
    try {
      await applyManifestExec(manifest)
    } catch (err) {
      return err
    }
  }, applyConcurrencyLimit)

  const applyManifest = async (manifest) => {
    const result = await q.push(manifest)
    if (result instanceof Error) {
      throw result
    }
  }

  const deps = getDeps(manifests, context)

  const getManifestDependencies = (manifest) => {
    const { metadata, kind } = manifest
    const annotations = metadata?.annotations
    if (!annotations) {
      return
    }

    const jsonNeeds = annotations["kontinuous/plugin.needs"]

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

    const dependencies = [...needsManifests].map((m) => {
      const { namespace, labels } = m.metadata
      const resourceName = labels["kontinuous/resourceName"]
      return {
        namespace,
        resourceName,
      }
    })

    return dependencies
  }

  const dependenciesReady = async (manifest) => {
    const dependencies = getManifestDependencies(manifest)
    if (!dependencies) {
      return
    }
    await Promise.all(
      dependencies.map(async (dependency) => {
        await new Promise((resolve, reject) => {
          const dependencyKey = `${dependency.namespace}/${dependency.resourceName}`
          eventsBucket.on("ready", ({ resourceName, namespace }) => {
            const key = `${namespace}/${resourceName}`
            if (key !== dependencyKey) {
              return
            }
            resolve()
          })
          eventsBucket.on("failed", ({ resourceName, namespace }) => {
            const key = `${namespace}/${resourceName}`
            if (key !== dependencyKey) {
              return
            }
            reject(new Error(`resource ${namespace}/${resourceName} failed`))
          })
        })
      })
    )
  }

  const countAllRunnable = manifests.filter((manifest) =>
    kindIsRunnable(manifest.kind)
  ).length
  eventsBucket.trigger("initDeployment", { countAllRunnable })

  const { deploymentLabelKey } = config
  const rolloutStatusProcesses = {}
  const interceptor = { stop: false }
  const rolloutStatusManifest = async (manifest) => {
    const { kind } = manifest
    if (!handledKinds.includes(kind)) {
      return
    }
    const resourceName = manifest.metadata.labels?.["kontinuous/resourceName"]
    const deploymentLabelValue = manifest.metadata?.labels?.[deploymentLabelKey]
    const namespace = manifest.metadata?.namespace
    if (!resourceName) {
      return
    }
    const labelSelectors = []
    labelSelectors.push(`kontinuous/resourceName=${resourceName}`)
    if (deploymentLabelValue) {
      labelSelectors.push(`${deploymentLabelKey}=${deploymentLabelValue}`)
    }
    const selector = labelSelectors.join(",")

    await new Promise(async (resolve, reject) => {
      const eventParam = { namespace, resourceName, selector }
      try {
        logger.debug(
          { namespace, selector },
          `watching resource: ${resourceName}`
        )
        eventsBucket.trigger("waiting", eventParam)
        const result = await rolloutStatusWatch({
          namespace,
          selector,
          interceptor,
          rolloutStatusProcesses,
          kubeconfig,
          kubecontext: kubeconfigContext,
          logger,
        })

        if (result.success) {
          logger.debug(
            { namespace, selector },
            `resource "${resourceName}" ready`
          )
          eventsBucket.trigger("ready", eventParam)
          resolve()
        } else if (result.error?.code || result.error?.reason) {
          const errMsg = `resource "${resourceName}" failed`
          logger.error(
            {
              namespace,
              selector,
              error: result.error,
            },
            errMsg
          )
          eventsBucket.trigger("failed", eventParam)
          throw new Error(errMsg)
        } else {
          eventsBucket.trigger("closed", eventParam)
          resolve()
        }
      } catch (err) {
        eventsBucket.trigger("failed", eventParam)
        reject(err)
      }
    })
  }

  const applyAll = async () =>
    Promise.all(
      manifests.map(async (manifest) => {
        await dependenciesReady(manifest)
        await applyManifest(manifest)
        await rolloutStatusManifest(manifest)
      })
    )

  const applyPromise = !dryRun ? applyAll() : null

  const stopRolloutStatus = () => {
    interceptor.stop = true
    for (const p of Object.values(rolloutStatusProcesses)) {
      try {
        process.kill(p.pid, "SIGKILL")
      } catch (_err) {
        // do nothing
      }
    }
  }

  for (const signal of signals) {
    process.on(signal, () => {
      for (const kubectlProc of kubectlProcesses) {
        kubectlProc.kill(signal)
      }
      stopRolloutStatus()
      process.exit(0)
    })
  }

  const promise = new Promise(async (resolve, reject) => {
    try {
      if (!dryRun) {
        await applyPromise
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
    stopRolloutStatus()
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
