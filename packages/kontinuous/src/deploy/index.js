const fs = require("fs-extra")

const ctx = require("~common/ctx")
const yaml = require("~common/utils/yaml")
const timeLogger = require("~common/utils/time-logger")

const build = require("~/build")
const { setStatus } = require("~/status")

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
    let manifestsFile = options.F
    let manifests
    if (!manifestsFile) {
      const result = await build(options)
      manifestsFile = result.manifestsFile
      manifests = result.manifests
    } else {
      manifests = await fs.readFile(manifestsFile, { encoding: "utf-8" })
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
    await deployHooks(allManifests, "pre")

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
    logger.info(`deploying ${repositoryName} ${namespacesLabel}`)

    const elapsed = timeLogger({
      logger,
      logLevel: "info",
    })

    const { dryRun } = options

    const runContext = {}

    const commonDeployContext = {
      manifestsFile,
      manifestsYaml: manifests,
      manifests: allManifests,
      runContext,
      dryRun,
    }

    const { stopDeploys, deploysPromise } = await deployWith({
      ...commonDeployContext,
    })
    runContext.stopDeploys = stopDeploys

    const { stopSidecars, sidecarsPromise } = await deploySidecars({
      ...commonDeployContext,
      deploysPromise,
    })
    runContext.stopSidecars = stopSidecars

    try {
      await Promise.allSettled([deploysPromise, sidecarsPromise])
    } catch (error) {
      logger.error({ error }, "deploy failed")
      stopSidecars()
      stopDeploys()
      throw error
    }

    await deployHooks(allManifests, "post")

    elapsed.end({
      label: `🚀 kontinuous pipeline ${repositoryName} ${environment} ${namespacesLabel}`,
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
