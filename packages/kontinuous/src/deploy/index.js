const fs = require("fs-extra")

const ctx = require("~common/ctx")
const yaml = require("~common/utils/yaml")
const timeLogger = require("~common/utils/time-logger")

const build = require("~/build")
const { setStatus } = require("~/status")

const deployHooks = require("./deploy-hooks")
const deployOnWebhook = require("./deploy-on-webhook")
const kappDeploy = require("./kapp-deploy")
const rolloutStatusChecker = require("./rollout-status-checker")
const buildDeployHooks = require("./build-deploy-hooks")

module.exports = async (options) => {
  ctx.provide()

  await buildDeployHooks()

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

    logger.info(
      { kubeconfig, kubeconfigContext },
      "let's deploy on kubernetes with kapp"
    )

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

    const { promise: kappDeployPromise, process: kappDeployProcess } =
      await kappDeploy({
        manifestsFile,
      })

    const { promise: rolloutStatusCheckerPromise, stopRolloutStatus } =
      await rolloutStatusChecker({
        manifests: allManifests,
        kappDeployProcess,
      })

    try {
      await kappDeployPromise
      stopRolloutStatus()
    } catch (error) {
      logger.error({ error }, "kapp deploy failed")
      stopRolloutStatus()
      const { errors } = await rolloutStatusCheckerPromise
      if (errors.length) {
        for (const errorData of errors) {
          logger.error(
            {
              code: errorData.code,
              type: errorData.type,
              log: errorData.log,
              message: errorData.message,
            },
            `rollout-status ${errorData.code} error: ${errorData.message}`
          )
        }
      }
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
    if (statusUrl) {
      await setStatus({ url: statusUrl, status: "failed", ok: false })
    }
    process.exit(1)
  }
}
