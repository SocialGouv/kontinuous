const { spawn } = require("child_process")
const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")
const retry = require("async-retry")

const logger = require("~common/utils/logger")
const asyncShell = require("~common/utils/async-shell")
const timeLogger = require("~common/utils/time-logger")
const slug = require("~common/utils/slug")
const parseCommand = require("~common/utils/parse-command")
const writeKubeconfig = require("~common/utils/write-kubeconfig")
const build = require("~/build")

const ctx = require("~/ctx")

module.exports = async (options) => {
  ctx.provide()

  const elapsed = timeLogger({
    logger,
    logLevel: "info",
  })

  const config = ctx.require("config")

  const { environment, gitRepositoryName: repositoryName } = config

  let kubeconfigContext =
    options.kubeconfigContext || process.env.KS_KUBECONFIG_CONTEXT
  if (!kubeconfigContext) {
    const { kubeconfigContextNoDetect } = options
    if (kubeconfigContextNoDetect) {
      kubeconfigContext = await asyncShell("kubectl config current-context")
    } else if (environment === "prod") {
      kubeconfigContext = "prod"
    } else {
      kubeconfigContext = "dev"
    }
  }
  logger.info(`kubeconfig context: "${kubeconfigContext}"`)

  await writeKubeconfig([
    "KUBECONFIG",
    `KUBECONFIG_${environment.toUpperCase()}`,
  ])

  const getRancherProjectId = async (ciNamespace) => {
    logger.info(
      `option rancher-project-id not provided, getting from cluster using ci-namespace "${ciNamespace}"`
    )
    const json = await asyncShell(
      `kubectl --context ${kubeconfigContext} get ns ${ciNamespace} -o json`
    )
    const data = JSON.parse(json)
    return data.metadata.annotations["field.cattle.io/projectId"]
  }

  const rancherProjectName =
    options.rancherProjectName || process.env.RANCHER_PROJECT_NAME

  const ciNamespace =
    options.ciNamespace ||
    process.env.KS_CI_NAMESPACE ||
    `${rancherProjectName || repositoryName}-ci`

  if (!process.env.RANCHER_PROJECT_ID) {
    process.env.RANCHER_PROJECT_ID =
      options.rancherProjectId || (await getRancherProjectId(ciNamespace))
  }

  let manifestsFile = options.F
  let manifests
  if (!manifestsFile) {
    const result = await build(options)
    manifestsFile = result.manifestsFile
    manifests = result.manifests
  } else {
    manifests = await fs.readFile(manifestsFile, { encoding: "utf-8" })
  }

  const allManifests = yaml.loadAll(manifests)

  const namespaceManifest = allManifests.find(
    (manifest) =>
      manifest.kind === "Namespace" &&
      manifest.metadata?.annotations?.["kontinuous/mainNamespace"]
  )

  const namespace = namespaceManifest.metadata.name

  const checkNamespaceIsAvailable = async () => {
    logger.debug("checking if namespace is available")
    try {
      const json = await asyncShell(
        `kubectl --context ${kubeconfigContext} get ns ${namespace} -o json`
      )
      const data = JSON.parse(json)
      return data?.status.phase === "Active"
    } catch (_e) {
      // do nothing
    }
    return false
  }

  const createNamespace = async () => {
    if (await checkNamespaceIsAvailable()) {
      return
    }

    try {
      let ignoreError
      await new Promise((resolve, reject) => {
        logger.info("creating namespace")
        const proc = spawn(
          "kubectl",
          [`--context=${kubeconfigContext}`, "create", "-f", "-"],
          {
            encoding: "utf-8",
          }
        )

        proc.stdin.write(JSON.stringify(namespaceManifest))

        proc.stdout.on("data", (data) => {
          process.stdout.write(data.toString())
        })
        proc.stderr.on("data", (data) => {
          const message = data.toString()
          if (message.includes("AlreadyExists")) {
            ignoreError = true
            logger.info("namespace already exists")
          } else {
            logger.warn(message)
          }
        })
        proc.on("close", (code) => {
          if (code === 0 || ignoreError) {
            resolve()
          } else {
            reject(
              new Error(`creating namespace failed with exit code ${code}`)
            )
          }
        })

        proc.stdin.end()
      })
    } catch (err) {
      logger.error(err)
      throw err
    }

    await retry(
      async () => {
        if (!(await checkNamespaceIsAvailable())) {
          throw Error("namespace is not available")
        }
      },
      {
        retries: 10,
        factor: 1,
        minTimeout: 1000,
        maxTimeout: 3000,
      }
    )
  }

  const charts = config.chart?.join(",")

  const kappApp = charts ? slug(`${repositoryName}-${charts}`) : repositoryName

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

  logger.info(`ensure namespace "${namespace}" is active`)
  await createNamespace()

  logger.info(`deploying ${repositoryName} to ${namespace}`)
  await deployWithKapp()

  elapsed.end({
    label: `🚀 kontinuous pipeline ${repositoryName} ${environment} to "${namespace}"`,
  })
}
