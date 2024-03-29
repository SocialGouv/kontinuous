const { spawn } = require("child_process")

const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

module.exports = async (
  options,
  { config, logger, needBin, utils, manifestsFile, dryRun }
) => {
  const { parseCommand, needKapp } = utils

  const { kubeconfigContext, kubeconfig, deploymentEnvLabelValue } = config

  const {
    kubeApiQps = 1000,
    kubeApiBurst = 1000,
    waitConcurrency = 5,
    waitCheckInterval = "1s",
    existingNonLabeledResourcesCheckConcurrency = 100,
    existingNonLabeledResourcesCheck = true,
    logsAll = true,
    deployTimeout = "15m",
  } = options

  await needBin(needKapp)

  const kappDeployCommand = dryRun
    ? "kapp --version"
    : `
        kapp deploy
        ${kubeconfigContext ? `--kubeconfig-context ${kubeconfigContext}` : ""}
          --app label:kontinuous/kapp=${deploymentEnvLabelValue}
          ${logsAll ? "--logs-all" : ""}
          --wait-timeout ${deployTimeout}
          --wait-check-interval ${waitCheckInterval}
          --wait-concurrency ${waitConcurrency}
          --existing-non-labeled-resources-check=${existingNonLabeledResourcesCheck}
          --existing-non-labeled-resources-check-concurrency ${existingNonLabeledResourcesCheckConcurrency}
          --dangerous-override-ownership-of-existing-resources
          --diff-changes=true
          --kube-api-qps ${kubeApiQps}
          --kube-api-burst ${kubeApiBurst}
          --yes
          -f ${manifestsFile}
      `

  const [cmd, args] = parseCommand(kappDeployCommand)

  logger.debug(`Launch kapp:${kappDeployCommand}`)
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
    })
  }

  proc.stdout.on("data", (data) => {
    process.stdout.write(data.toString())
  })
  proc.stderr.on("data", (data) => {
    logger.warn(data.toString())
  })

  return new Promise((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`kapp deploy failed with exit code ${code}`))
      }
    })
  })
}
