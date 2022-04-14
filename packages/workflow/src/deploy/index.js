const path = require("path")
const os = require("os")
const { mkdtemp } = require("fs/promises")
const { spawn } = require("child_process")
const fs = require("fs-extra")
const yaml = require("js-yaml")
const retry = require("async-retry")

const logger = require("~common/utils/logger")
const shell = require("~common/utils/shell")

const timeLogger = require("~common/utils/time-logger")
const getGitInfos = require("~common/utils/get-git-infos")
const selectEnv = require("~common/utils/select-env")
const slug = require("~common/utils/slug")
const parseCommand = require("~common/utils/parse-command")
const build = require("~/build")

module.exports = async (options) => {
  const elapsed = timeLogger({
    logger,
    logLevel: "info",
  })

  const cwd = options.cwd || process.cwd()
  const { GIT_REPOSITORY } = getGitInfos(cwd)

  const repositoryName = path.basename(GIT_REPOSITORY)

  const selectedEnv = selectEnv({ options, cwd })

  let { kubeconfigContext } = options
  if (!kubeconfigContext) {
    const { kubeconfigContextNoDetect } = options
    if (kubeconfigContextNoDetect) {
      kubeconfigContext = shell("kubectl config current-context")
    } else if (selectedEnv === "prod") {
      kubeconfigContext = "prod"
    } else {
      kubeconfigContext = "dev"
    }
  }

  if (process.env.KUBECONFIG && process.env.KUBECONFIG.includes("\n")) {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), `kube-workflow`))
    const kubeconfigFile = `${tmpDir}/.kubeconfig`
    await fs.writeFile(kubeconfigFile, process.env.KUBECONFIG)
    process.env.KUBECONFIG = kubeconfigFile
  }

  const getRancherProjectId = (rancherProjectName) => {
    const jobNamespace = `${rancherProjectName}-ci`
    const json = shell(
      `kubectl --context ${kubeconfigContext} get ns ${jobNamespace} -o json`
    )
    const data = JSON.parse(json)
    return data.metadata.annotations["field.cattle.io/projectId"]
  }

  if (options.rancherProjectName) {
    process.env.RANCHER_PROJECT_NAME = options.rancherProjectName
  }
  if (!process.env.RANCHER_PROJECT_ID) {
    process.env.RANCHER_PROJECT_ID =
      options.rancherProjectId ||
      getRancherProjectId(process.env.RANCHER_PROJECT_NAME || repositoryName)
  }

  let manifestsFile = options.F
  let manifests
  if (!manifestsFile) {
    const result = await build(options)
    manifestsFile = result.manifestsFile
    manifests = result.manifests
  } else {
    manifests = fs.readFileSync(manifestsFile, { encoding: "utf-8" })
  }

  const allManifests = yaml.loadAll(manifests)

  const namespaceManifest = allManifests.find(
    (manifest) =>
      manifest.kind === "Namespace" &&
      manifest.metadata?.annotations?.["kubeworkflow/mainNamespace"]
  )

  const namespace = namespaceManifest.metadata.name

  const checkNamespaceIsAvailable = () => {
    try {
      const json = shell(
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
    if (checkNamespaceIsAvailable()) {
      return
    }

    try {
      let ignoreError
      await new Promise((resolve, reject) => {
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
            logger.info("Namespace already exists")
          } else {
            logger.warn(message)
          }
        })
        proc.on("close", (code) => {
          if (code === 0 || ignoreError) {
            resolve()
          } else {
            reject(
              new Error(`Creating namespace failed with exit code ${code}`)
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
        if (!checkNamespaceIsAvailable()) {
          throw Error("Namespace is not available")
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

  const charts = options.charts || process.env.KW_CHARTS

  const kappApp = charts ? slug(`${repositoryName}-${charts}`) : repositoryName

  const kappWaitTimeout =
    options.timeout || process.env.KW_DEPLOY_TIMEOUT || "15m0s"

  const deployWithKapp = async () => {
    const [cmd, args] = parseCommand(`
      kapp deploy
        --kubeconfig-context ${kubeconfigContext}
        --app label:kubeworkflow/kapp=${kappApp}
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

  logger.info(`Ensure namespace "${namespace}" is active`)
  await createNamespace()

  logger.info(`Deploying ${repositoryName} to ${namespace}`)
  await deployWithKapp()

  elapsed.end({
    label: `🚀 kube-workflow pipeline ${repositoryName} ${selectedEnv} to "${namespace}"`,
  })
}
