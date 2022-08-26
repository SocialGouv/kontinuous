const { spawn } = require("child_process")

const fs = require("fs-extra")

const ctx = require("~common/ctx")
const needKapp = require("~common/utils/need-kapp")
const yaml = require("~common/utils/yaml")
const timeLogger = require("~common/utils/time-logger")
const slug = require("~common/utils/slug")
const parseCommand = require("~common/utils/parse-command")

const needBin = require("~/bin/need-bin")
const build = require("~/build")
const { setStatus } = require("~/status")

const deployHooks = require("./deploy-hooks")
const deployOnWebhook = require("./deploy-on-webhook")

const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

module.exports = async (options) => {
  ctx.provide()

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

    const charts = config.chart?.join(",")

    const kappApp = slug(
      `${repositoryName}-${config.gitBranch}${charts ? `-${charts}` : ""}`
    )

    const kappWaitTimeout =
      options.timeout || process.env.KS_DEPLOY_TIMEOUT || "15m0s"

    await needBin(needKapp)

    const deployWithKapp = async () => {
      const [cmd, args] = parseCommand(`
        kapp deploy
          ${
            kubeconfigContext ? `--kubeconfig-context ${kubeconfigContext}` : ""
          }
          --app label:kontinuous/kapp=${kappApp}
          --logs-all
          --wait-timeout ${kappWaitTimeout}
          --dangerous-override-ownership-of-existing-resources
          --yes
          -f ${manifestsFile}
      `)

      try {
        await new Promise((resolve, reject) => {
          const proc = spawn(cmd, args, {
            encoding: "utf-8",
            env: {
              ...process.env,
              ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
            },
          })

          for (const signal of signals) {
            process.on(signal, () => {
              proc.kill(signal)
              process.exit(0)
            })
          }

          proc.stdout.on("data", (data) => {
            process.stdout.write(data.toString())
          })
          proc.stderr.on("data", (data) => {
            logger.warn(data.toString())
          })
          proc.on("close", (code) => {
            if (code === 0) {
              resolve()
            } else {
              reject(new Error(`kapp deploy failed with exit code ${code}`))
            }
          })
        })
      } catch (err) {
        logger.error(err)
        throw err
      }
    }

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

    try {
      await deployWithKapp()
    } catch (error) {
      logger.error({ error }, "kapp deploy failed")
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
