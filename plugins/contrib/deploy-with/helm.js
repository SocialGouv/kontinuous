const { spawn } = require("child_process")

const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

module.exports = async (
  deploys,
  _options,
  { config, logger, needBin, utils, manifestsFile, dryRun }
) => {
  const { parseCommand, needHelm, slug } = utils

  const { kubeconfigContext, kubeconfig, repositoryName, deployTimeout } =
    config

  const charts = config.chart?.join(",")

  const helmRelease = slug(
    `${repositoryName}-${config.gitBranch}${charts ? `-${charts}` : ""}`
  )

  await needBin(needHelm)

  const helmDeployCommand = dryRun
    ? "helm version"
    : `
        helm upgrade
          ${helmRelease}
          ${manifestsFile}
          --install
          ${kubeconfigContext ? `--kube-context ${kubeconfigContext}` : ""}
          --force
          --wait
          --timeout ${deployTimeout}
      `

  const [cmd, args] = parseCommand(helmDeployCommand)

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
        reject(new Error(`helm deploy failed with exit code ${code}`))
      }
    })
  })

  deploys.push({ promise, process: proc })
}

/*
   .replaceAll("{{",'{{ "{{" }}')
   .replaceAll("}}",'{{ "}}" }}')
*/
