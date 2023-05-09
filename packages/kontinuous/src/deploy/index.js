const fs = require("fs-extra")

const ctx = require("~common/ctx")
const yaml = require("~common/utils/yaml")
const timeLogger = require("~common/utils/time-logger")
const promiseAll = require("~common/utils/promise-all")

const needRolloutStatus = require("~common/utils/need-rollout-status")
const needBin = require("~/lib/need-bin")
const build = require("~/build")
const { setStatus } = require("~/status")

const ExitError = require("~/errors/exit-error")
const FailedDeploymentAggregateError = require("~/errors/failed-deployment-aggregate-error")

const validateManifests = require("../build/validate-manifests")
const dependencies = require("../build/load-dependencies/dependencies")
const deployHooks = require("./deploy-hooks")
const deployOnWebhook = require("./deploy-on-webhook")
const buildDeployPlugins = require("./build-deploy-plugins")
const deploySidecars = require("./deploy-sidecars")
const deployWith = require("./deploy-with")

const deploy = async (options) => {
  await buildDeployPlugins()

  const config = ctx.require("config")
  const logger = ctx.require("logger")

  const {
    environment,
    gitRepositoryUrl,
    gitRepositoryName: repositoryName,
    statusUrl,
    webhookUri,
    webhookToken: token,
    kubeconfig,
    kubeconfigContext,
    deployCustomManifestsOnWebhook,
  } = config

  try {
    const elapsed = timeLogger({
      logger,
      logLevel: "debug",
    })

    let manifestsFile = options.F
    let manifests
    if (!manifestsFile) {
      const result = await build(options)
      manifestsFile = result.manifestsFile
      manifests = result.manifests
    } else {
      manifests = await fs.readFile(manifestsFile, { encoding: "utf-8" })
      const manifestsObjects = yaml.loadAll(manifests)
      await dependencies(config, logger)
      await validateManifests(manifestsObjects)
    }

    if (deployCustomManifestsOnWebhook) {
      await deployOnWebhook({
        options,
        manifests,
        repositoryName,
        environment,
        token,
        gitRepositoryUrl,
        webhookUri,
        statusUrl,
      })
      return
    }

    await needBin(needRolloutStatus)

    if (statusUrl) {
      await setStatus({ url: statusUrl, token, status: "loading", ok: null })
    }

    logger.info(
      { kubeconfig, kubeconfigContext },
      "🐳 let's deploy on kubernetes"
    )

    const allManifests = yaml.loadAll(manifests)

    const abortSignal = ctx.require("abortSignal")

    abortSignal.throwIfAborted()
    if (!config.disableStep.includes("pre-deploy")) {
      logger.info("🌀 [LIFECYCLE]: pre-deploy")
      await deployHooks(allManifests, "pre")
    }

    const namespacesManifests = allManifests.filter(
      (manifest) => manifest.kind === "Namespace"
    )
    const namespaces = namespacesManifests.map(
      (manifest) => manifest.metadata.name
    )
    let namespacesLabel = ""
    if (namespaces.length > 0) {
      namespacesLabel = `to namespace${
        namespaces.length > 1 ? "s" : ""
      } "${namespaces.join('","')}"`
    }

    const { dryRun } = options

    const deployContext = {
      manifestsFile,
      manifestsYaml: manifests,
      manifests: allManifests,
      dryRun,
    }

    abortSignal.throwIfAborted()

    let deploysPromise
    let sidecarsPromise
    if (!config.disableStep.includes("deploy")) {
      logger.info("🌀 [LIFECYCLE]: deploy")
      logger.info(`🚀 deploying ${repositoryName} ${namespacesLabel}`)
      if (!config.disableStep.includes("deploy-with")) {
        logger.info("🌀 [LIFECYCLE]: deploy-with")
        deploysPromise = deployWith(deployContext)
      }

      if (!config.disableStep.includes("deploy-sidecars")) {
        logger.info("🌀 [LIFECYCLE]: deploy-sidecars")
        sidecarsPromise = deploySidecars(deployContext)
      }
    }

    const results = await promiseAll([deploysPromise, sidecarsPromise])

    const errors = results
      .filter((result) => result?.errors)
      .flatMap((result) => result.errors)

    const success = errors.length === 0

    abortSignal.throwIfAborted()

    if (!config.disableStep.includes("post-deploy")) {
      logger.info("🌀 [LIFECYCLE]: post-deploy")
      await deployHooks(allManifests, "post", { errors, success })
    }

    if (!success) {
      throw new FailedDeploymentAggregateError(
        errors,
        "errors encountered during deployment"
      )
    }

    logger.info(
      `✅ kontinuous pipeline ${repositoryName} ${environment} ${namespacesLabel}: ok`
    )
    elapsed.end({
      label: "🏁 pipeline runned in",
    })

    if (statusUrl) {
      await setStatus({ url: statusUrl, token, status: "success", ok: true })
    }
  } catch (err) {
    if (statusUrl) {
      await setStatus({ url: statusUrl, token, status: "failed", ok: false })
    }
    throw new ExitError(err)
  }
}

module.exports = async (options) => {
  ctx.provide(async () => {
    await deploy(options)
  })
}
