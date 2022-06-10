const { spawn } = require("child_process")
const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")

const logger = require("~common/utils/logger")
const timeLogger = require("~common/utils/time-logger")
const slug = require("~common/utils/slug")
const parseCommand = require("~common/utils/parse-command")
const writeKubeconfig = require("~common/utils/write-kubeconfig")
const kubeEnsureNamespace = require("~common/utils/kube-ensure-namespace")
const build = require("~/build")
const { setStatus } = require("~/status")

const ctx = require("~/ctx")

module.exports = async (options) => {
  ctx.provide()

  const elapsed = timeLogger({
    logger,
    logLevel: "info",
  })

  const config = ctx.require("config")

  const {
    environment,
    gitRepositoryName: repositoryName,
    statusUrl,
    // webhookUri,
    // webhookToken: token,
    kubeconfigContext,
  } = config

  const statusSet = async (status, ok = null) => {
    if (statusUrl) {
      await setStatus({ url: statusUrl, status, ok })
    }
  }

  await statusSet("loading")

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

    if (options.X) {
      console.log(config)
      return
    }

    logger.info(`kubeconfig context: "${kubeconfigContext}"`)

    await writeKubeconfig([
      "KUBECONFIG",
      `KUBECONFIG_${environment.toUpperCase()}`,
    ])
    const allManifests = yaml.loadAll(manifests)

    const charts = config.chart?.join(",")

    const kappApp = charts
      ? slug(`${repositoryName}-${charts}`)
      : repositoryName

    const kappWaitTimeout =
      options.timeout || process.env.KS_DEPLOY_TIMEOUT || "15m0s"

    const deployWithKapp = async () => {
      const [cmd, args] = parseCommand(`
        kapp deploy
          --kubeconfig-context ${kubeconfigContext}
          --app label:kontinuous/kapp=${kappApp}
          --logs-all
          --wait-timeout ${kappWaitTimeout}
          --dangerous-override-ownership-of-existing-resources
          --yes
          -f ${manifestsFile}
      `)

      try {
        await new Promise((resolve, reject) => {
          const proc = spawn(cmd, args, { encoding: "utf-8" })

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

    const rancherNamespacesManifests = allManifests.filter(
      (manifest) =>
        manifest.kind === "Namespace" &&
        manifest.metadata?.annotations?.["field.cattle.io/projectId"]
    )

    await Promise.all(
      rancherNamespacesManifests.map((manifest) =>
        kubeEnsureNamespace(kubeconfigContext, manifest)
      )
    )

    const namespaces = rancherNamespacesManifests
      .map((manifest) => manifest.metadata.name)
      .join(",")

    logger.info(`deploying ${repositoryName} to ${namespaces}`)
    await deployWithKapp()

    elapsed.end({
      label: `🚀 kontinuous pipeline ${repositoryName} ${environment} to "${namespaces}"`,
    })

    await statusSet("success", true)
  } catch (err) {
    await statusSet("failed", false)
    throw err
  }
}
