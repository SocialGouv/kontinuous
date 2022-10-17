const { setTimeout } = require("timers/promises")
const { spawn } = require("child_process")

const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

module.exports = async (
  deploys,
  options,
  { config, logger, needBin, utils, manifestsFile, dryRun }
) => {
  const {
    parseCommand,
    needKapp,
    // slug
    fs,
  } = utils

  const {
    kubeconfigContext,
    kubeconfig,
    // repositoryName,
    deployTimeout,
  } = config

  const { kubeApiQps = 1000, kubeApiBurst = 1000, logsAll = true } = options

  // const charts = config.chart?.join(",")
  // const kappApp = slug(
  //   `${repositoryName}-${config.gitBranch}${charts ? `-${charts}` : ""}`
  // )

  const manifests = utils.yaml.loadAll(await fs.readFile(manifestsFile))
  const mainNamespace = manifests.filter(
    (manifest) =>
      manifest.kind === "Namespace" &&
      manifest.metadata?.annotations?.["kontinuous/mainNamespace"]
  )
  const ns = mainNamespace.metadata?.annotations?.["kontinuous/mainNamespace"]

  await needBin(needKapp)

  const kappDeployCommand = dryRun
    ? "kapp --version"
    : `
        kapp deploy
          ${
            kubeconfigContext ? `--kubeconfig-context ${kubeconfigContext}` : ""
          }
          --namespace ${ns}
          ${logsAll ? "--logs-all" : ""}
          --wait-timeout ${deployTimeout}
          --dangerous-override-ownership-of-existing-resources
          --diff-changes=true
          --kube-api-qps ${kubeApiQps}
          --kube-api-burst ${kubeApiBurst}
          --yes
          -f ${manifestsFile}
      `

  const [cmd, args] = parseCommand(kappDeployCommand)

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

  const promise = new Promise((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`kapp deploy failed with exit code ${code}`))
      }
    })
  })

  const stopDeploy = async () => {
    const kappTerminationTolerationPeriod = 2000
    try {
      process.kill(proc.pid, "SIGTERM")
      await setTimeout(kappTerminationTolerationPeriod)
      process.kill(proc.pid, "SIGKILL")
    } catch (_err) {
      // do nothing
    }
  }

  deploys.push({ promise, stopDeploy })
}
