const fs = require("fs-extra")

const ctx = require("~common/ctx")
const yaml = require("~common/utils/yaml")
const timeLogger = require("~common/utils/time-logger")
const eventsBucket = require("~common/utils/events-bucket")
const promiseAll = require("~common/utils/promise-all")

const build = require("~/build")
const { setStatus } = require("~/status")

const validateManifests = require("../build/validate-manifests")
const deployHooks = require("./deploy-hooks")
const deployOnWebhook = require("./deploy-on-webhook")
const buildDeployPlugins = require("./build-deploy-plugins")
const deploySidecars = require("./deploy-sidecars")
const deployWith = require("./deploy-with")

module.exports = async (options) => {
  ctx.provide()

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
  } = config

  const onWebhook = options.W

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
      await validateManifests(manifestsObjects)
    }

    if (onWebhook) {
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

    if (statusUrl) {
      await setStatus({ url: statusUrl, status: "loading", ok: null })
    }

    logger.info({ kubeconfig, kubeconfigContext }, "let's deploy on kubernetes")

    const allManifests = yaml.loadAll(manifests)

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

    const runContext = {
      eventsBucket: eventsBucket(),
    }

    const deployContext = {
      manifestsFile,
      manifestsYaml: manifests,
      manifests: allManifests,
      runContext,
      dryRun,
    }

    if (!config.disableStep.includes("deploy")) {
      logger.info("🌀 [LIFECYCLE]: deploy")
      logger.info(`🚀 deploying ${repositoryName} ${namespacesLabel}`)
      if (!config.disableStep.includes("deploy-with")) {
        logger.info("🌀 [LIFECYCLE]: deploy-with")
        const { stopDeploys, deploysPromise } = await deployWith(deployContext)
        runContext.stopDeploys = stopDeploys
        runContext.deploysPromise = deploysPromise
      }

      if (!config.disableStep.includes("deploy-sidecars")) {
        logger.info("🌀 [LIFECYCLE]: deploy-sidecars")
        const { stopSidecars, sidecarsPromise } = await deploySidecars(
          deployContext
        )
        runContext.stopSidecars = stopSidecars
        runContext.sidecarsPromise = sidecarsPromise
      }
    }

    const results = await promiseAll([
      runContext.deploysPromise,
      runContext.sidecarsPromise,
    ])
    runContext.stopSidecars()
    runContext.stopDeploys()
    const errors = results
      .filter((result) => result?.errors)
      .flatMap((result) => result.errors)
    if (errors.length) {
      throw new AggregateError(errors, "errors encountered during deployment")
    }

    if (!config.disableStep.includes("post-deploy")) {
      logger.info("🌀 [LIFECYCLE]: post-deploy")
      await deployHooks(allManifests, "post")
    }

    logger.info(
      `✅ kontinuous pipeline ${repositoryName} ${environment} ${namespacesLabel}: ok`
    )
    elapsed.end({
      label: "🏁 pipeline runned in",
    })

    if (statusUrl) {
      await setStatus({ url: statusUrl, status: "success", ok: true })
    }
  } catch (err) {
    logger.error(err)
    if (statusUrl) {
      await setStatus({ url: statusUrl, status: "failed", ok: false })
    }
    process.exit(1)
  }
}
